// Local data store (demo backend). Persists to localStorage and syncs across
// browser tabs (open two tabs, log in as worker and employer, and see realtime updates).
// Every function here maps 1:1 to a Supabase table / RPC in supabase/schema.sql,
// so this file is the only place to swap when connecting the real backend.
import { useSyncExternalStore } from 'react';
import { buildSeed } from './seed';
import { haversine, MATHURA } from './geo';

const KEY = 'kaamsetu_state_v1';
const DAY = 86400000;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return buildSeed();
}

let state = load();

function emit() { listeners.forEach((l) => l()); }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
}
export function setState(fn) {
  state = { ...state, ...fn(state) };
  persist();
  emit();
}
export const getState = () => state;
export function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) { state = JSON.parse(e.newValue); emit(); }
  });
}

export function useStore() { return useSyncExternalStore(subscribe, getState); }

export function resetDemo() {
  const lang = state.lang;
  state = { ...buildSeed(), lang };
  persist();
  emit();
}

const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- selectors ----------
export const userById = (s, id) => s.users.find((u) => u.id === id);
export const me = (s) => userById(s, s.currentUserId);
export const isEmployer = (u) => u && (u.role === 'household' || u.role === 'business');
export const locOf = (u) => (u && u.lat != null ? { lat: u.lat, lng: u.lng } : MATHURA);

export function ratingOf(s, workerId) {
  const rs = s.reviews.filter((r) => r.workerId === workerId);
  if (!rs.length) return { avg: 0, count: 0, list: [] };
  const avg = rs.reduce((a, r) => a + r.stars, 0) / rs.length;
  return { avg: Math.round(avg * 10) / 10, count: rs.length, list: rs.sort((a, b) => b.createdAt - a.createdAt) };
}

export function badgesOf(s, u) {
  const b = [];
  if (!u) return b;
  if (u.idStatus === 'verified') b.push('idVerified');
  if (u.policeStatus === 'verified') b.push('policeVerified');
  if (u.role === 'worker') {
    const r = ratingOf(s, u.id);
    if (r.avg >= 4.5 && r.count >= 3) b.push('recommended');
    if ((u.rehired || 0) > 0) b.push('rehired');
  }
  return b;
}

export function employerStats(s, employerId) {
  const hires = s.requests.filter((r) => (r.fromId === employerId || r.toId === employerId) && r.status === 'hired').length;
  const seededHires = { e1: 3, e2: 1, e3: 2, e4: 1, e5: 9, e6: 5, e7: 6, e8: 2 }[employerId] || 0;
  const rating = { e1: 4.8, e2: 4.3, e3: 4.6, e4: 4.5, e5: 4.7, e6: 4.4, e7: 4.2, e8: 4.9 }[employerId] || 4.5;
  return { hires: hires + seededHires, rating };
}

export function defaultPrefs(u) {
  if (!u) return {};
  if (u.role === 'worker') return { skills: u.skills || [], categories: u.primaryRole ? [u.primaryRole] : [], maxDistance: 10, workType: 'any', hours: '' };
  return { role: '', place: u.role === 'business' ? 'shop' : 'home', hours: '', workType: 'any', start: '', budgetMin: 5000, budgetMax: 25000, languages: [], gender: 'any', maxDistance: 10, verifiedOnly: false };
}
export const prefsOf = (s, u) => ({ ...defaultPrefs(u), ...(s.prefs[u?.id] || {}) });

/** Is there a request between these two (in either direction) that blocks re-requesting? */
function blockingRequest(s, a, b) {
  return s.requests.find((r) => ((r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a)) &&
    (r.status !== 'declined' && r.status !== 'expired' || Date.now() - (r.respondedAt || r.createdAt) < 30 * DAY));
}

function recentlyPassed(s, userId, targetId) {
  return s.swipes.some((w) => w.userId === userId && w.targetId === targetId && w.dir === 'left' && Date.now() - w.at < 30 * DAY);
}

function monthlyEquivalent(wage, type) { return type === 'day' ? wage * 26 : wage; }

/** Employer → list of worker cards with match score. */
export function workerMatches(s, viewer, { ignoreSwipes = false } = {}) {
  const p = prefsOf(s, viewer);
  const here = locOf(viewer);
  return s.users
    .filter((u) => u.role === 'worker' && !u.suspended && u.id !== viewer.id)
    .map((u) => {
      const distance = haversine(here, u);
      const r = ratingOf(s, u.id);
      const wageM = monthlyEquivalent(u.wage, u.wageType);
      const roleMatch = !p.role || u.primaryRole === p.role;
      const wageFit = wageM >= p.budgetMin && wageM <= p.budgetMax ? 1 : wageM < p.budgetMin ? 0.8 : Math.max(0, 1 - (wageM - p.budgetMax) / p.budgetMax);
      const langFit = !p.languages?.length || p.languages.some((l) => (u.languages || []).includes(l)) ? 1 : 0.3;
      const score = (roleMatch ? 40 : 0) + 25 * Math.max(0, 1 - distance / p.maxDistance) + 15 * wageFit + (u.available ? 10 : 0) + 10 * (r.avg / 5) + 5 * langFit
        + (u.boostUntil > Date.now() ? 15 : 0);
      return { kind: 'worker', id: u.id, user: u, distance, rating: r, score: Math.round(score) };
    })
    .filter((c) => c.distance <= p.maxDistance)
    .filter((c) => !p.role || c.user.primaryRole === p.role)
    .filter((c) => !p.verifiedOnly || c.user.idStatus === 'verified')
    .filter((c) => p.gender === 'any' || !p.gender || c.user.gender === p.gender)
    .filter((c) => ignoreSwipes || (!recentlyPassed(s, viewer.id, c.id) && !blockingRequest(s, viewer.id, c.id)))
    .sort((a, b) => b.score - a.score);
}

/** Worker → list of job cards with match score. */
export function jobMatches(s, viewer, { ignoreSwipes = false } = {}) {
  const p = prefsOf(s, viewer);
  const here = locOf(viewer);
  const expected = monthlyEquivalent(viewer.wage || 0, viewer.wageType);
  return s.jobs
    .filter((j) => j.open)
    .map((j) => {
      const employer = userById(s, j.employerId);
      if (!employer || employer.suspended) return null;
      const distance = haversine(here, j);
      const roleMatch = (p.categories || []).includes(j.role);
      const payM = monthlyEquivalent(j.pay, j.payType);
      const payFit = !expected ? 1 : payM >= expected ? 1 : Math.max(0, payM / expected - 0.2);
      const urgent = j.urgentUntil > Date.now();
      const score = (roleMatch ? 40 : 0) + 25 * Math.max(0, 1 - distance / p.maxDistance) + 15 * payFit + 10 + 10 * (employerStats(s, employer.id).rating / 5) + (urgent ? 20 : 0);
      return { kind: 'job', id: j.id, job: j, user: employer, distance, score: Math.round(score), roleMatch, urgent };
    })
    .filter(Boolean)
    .filter((c) => c.distance <= p.maxDistance)
    .filter((c) => ignoreSwipes || (!recentlyPassed(s, viewer.id, c.id) && !blockingRequest(s, viewer.id, c.user.id)))
    .sort((a, b) => b.score - a.score);
}

export const feedFor = (s, viewer, opts) => (!viewer ? [] : viewer.role === 'worker' ? jobMatches(s, viewer, opts) : workerMatches(s, viewer, opts));

// ---------- actions ----------
export function login(userId) { setState(() => ({ currentUserId: userId })); }
export function logout() { setState(() => ({ currentUserId: null })); }
export function setLang(lang) { setState(() => ({ lang })); }

export function createUser(data) {
  const id = uid(data.role === 'worker' ? 'w' : 'e');
  const user = {
    id, createdAt: Date.now(), idStatus: 'none', policeStatus: 'none', views: 0, languages: ['Hindi'],
    credits: 0, freeUsed: false, plan: null, available: true, skills: [], pastJobs: [],
    referralCode: `KS${(data.name || 'USER').split(' ')[0].toUpperCase().slice(0, 6)}${Math.floor(Math.random() * 90 + 10)}`,
    ...data,
  };
  setState((s) => ({ users: [...s.users, user], currentUserId: id }));
  if (user.role === 'worker') {
    // "New nearby match" for employers looking for this role
    const s = getState();
    s.users.filter((e) => isEmployer(e) && haversine(e, user) <= prefsOf(s, e).maxDistance && (!prefsOf(s, e).role || prefsOf(s, e).role === user.primaryRole))
      .forEach((e) => notify(e.id, `New ${user.primaryRole} near you: ${user.name}`, `आपके पास नया कामगार: ${user.name}`, 'match', '/app/people'));
  }
  return id;
}

export function updateUser(id, patch) {
  setState((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
}

export function setPrefs(id, patch) {
  setState((s) => ({ prefs: { ...s.prefs, [id]: { ...(s.prefs[id] || {}), ...patch } } }));
}

export function notify(userId, text, textHi, type, link) {
  setState((s) => ({ notifications: [{ id: uid('n'), userId, text, textHi, type, link, at: Date.now(), read: false }, ...s.notifications] }));
}
export function markNotificationsRead(userId) {
  setState((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) }));
}

export function recordView(targetId) {
  setState((s) => ({ users: s.users.map((u) => (u.id === targetId ? { ...u, views: (u.views || 0) + 1 } : u)) }));
}

/** Swipe on a card. Right = connection request. */
export function swipe(viewer, card, dir) {
  setState((s) => ({ swipes: [...s.swipes, { userId: viewer.id, targetId: card.id, dir, at: Date.now() }] }));
  if (card.user) recordView(card.user.id);
  if (dir === 'right') return sendRequest(viewer.id, card.user.id, card.kind === 'job' ? card.id : null);
  return null;
}

export function undoSwipe(viewerId) {
  const s = getState();
  const mine = s.swipes.filter((w) => w.userId === viewerId);
  const last = mine[mine.length - 1];
  if (!last) return null;
  setState((st) => {
    const idx = st.swipes.lastIndexOf(last);
    const swipes = st.swipes.filter((_, i) => i !== idx);
    let requests = st.requests;
    if (last.dir === 'right') {
      const job = st.jobs.find((j) => j.id === last.targetId);
      const toId = job ? job.employerId : last.targetId;
      requests = st.requests.filter((r) => !(r.fromId === viewerId && r.toId === toId && r.status === 'pending'));
    }
    return { swipes, requests };
  });
  return last;
}

export function toggleSave(userId, targetId) {
  setState((s) => {
    const exists = s.saved.some((x) => x.userId === userId && x.targetId === targetId);
    return { saved: exists ? s.saved.filter((x) => !(x.userId === userId && x.targetId === targetId)) : [...s.saved, { userId, targetId, at: Date.now() }] };
  });
}

export function sendRequest(fromId, toId, jobId = null) {
  const s = getState();
  if (blockingRequest(s, fromId, toId)) return null;
  const id = uid('q');
  const from = userById(s, fromId);
  setState((st) => ({ requests: [...st.requests, { id, fromId, toId, jobId, status: 'pending', createdAt: Date.now(), phoneRevealed: false }] }));
  notify(toId, `${from.name} sent you a connection request`, `${from.name} ने आपको अनुरोध भेजा`, 'request', '/app/requests');
  simulateBotResponse(id);
  return id;
}

export function employerOf(s, req) {
  const a = userById(s, req.fromId); const b = userById(s, req.toId);
  return isEmployer(a) ? a : isEmployer(b) ? b : null;
}
export function workerOf(s, req) {
  const a = userById(s, req.fromId); const b = userById(s, req.toId);
  return a?.role === 'worker' ? a : b?.role === 'worker' ? b : null;
}
export const otherParty = (s, req, myId) => userById(s, req.fromId === myId ? req.toId : req.fromId);

export function hasActivePlan(u) { return u?.plan && u.plan.until > Date.now(); }
export function creditLabel(u) {
  if (u?.plan?.name === 'pro' && hasActivePlan(u)) return '∞';
  return String(u?.credits || 0);
}

/** Charge one connection credit. Returns description string if charged, or null if no credit. */
function tryCharge(employerId, workerName) {
  const s = getState();
  const e = userById(s, employerId);
  if (!e) return null;
  let desc = null; let patch = null;
  if (e.plan?.name === 'pro' && hasActivePlan(e)) { desc = `Connection: ${workerName} (Pro plan)`; patch = {}; }
  else if (e.role === 'household' && !e.freeUsed) { desc = `Connection: ${workerName} (first one free)`; patch = { freeUsed: true }; }
  else if ((e.credits || 0) > 0) { desc = `Connection: ${workerName}`; patch = { credits: e.credits - 1 }; }
  if (!desc) return null;
  updateUser(employerId, patch);
  setState((st) => ({ transactions: [{ id: uid('t'), userId: employerId, amount: 0, credits: patch.credits !== undefined ? -1 : 0, desc, at: Date.now() }, ...st.transactions] }));
  return desc;
}

export function respondRequest(reqId, accept) {
  const s = getState();
  const req = s.requests.find((r) => r.id === reqId);
  if (!req || req.status !== 'pending') return;
  const responder = userById(s, req.toId);
  if (!accept) {
    setState((st) => ({ requests: st.requests.map((r) => (r.id === reqId ? { ...r, status: 'declined', respondedAt: Date.now() } : r)) }));
    notify(req.fromId, `${responder.name} is not available right now`, `${responder.name} अभी उपलब्ध नहीं हैं`, 'declined', '/app/requests');
    return;
  }
  const employer = employerOf(s, req);
  const worker = workerOf(s, req);
  const charged = employer && worker ? tryCharge(employer.id, worker.name) : null;
  setState((st) => ({ requests: st.requests.map((r) => (r.id === reqId ? { ...r, status: 'accepted', respondedAt: Date.now(), phoneRevealed: !!charged } : r)) }));
  notify(req.fromId, `${responder.name} accepted your request`, `${responder.name} ने आपका अनुरोध स्वीकार किया`, 'accepted', `/app/chat/${reqId}`);
  if (employer && !charged) {
    notify(employer.id, `Buy a connection credit to see ${worker.name}'s phone number`, `${worker.name} का फ़ोन नंबर देखने के लिए क्रेडिट लें`, 'payment', `/app/chat/${reqId}`);
  }
}

/** Called after a successful payment in chat — reveals the phone. */
export function unlockPhone(reqId) {
  const s = getState();
  const req = s.requests.find((r) => r.id === reqId);
  if (!req || req.phoneRevealed) return true;
  const employer = employerOf(s, req); const worker = workerOf(s, req);
  const ok = tryCharge(employer.id, worker.name);
  if (ok) setState((st) => ({ requests: st.requests.map((r) => (r.id === reqId ? { ...r, phoneRevealed: true } : r)) }));
  return !!ok;
}

export const PACKS = {
  household: [
    { id: 'h1', title: '1 connection', titleHi: '1 कनेक्शन', price: 99, credits: 1, note: 'Valid 60 days' },
    { id: 'h5', title: '5 connections', titleHi: '5 कनेक्शन', price: 249, credits: 5, note: 'Best value · valid 60 days' },
  ],
  business: [
    { id: 'basic', title: 'Basic plan', titleHi: 'बेसिक प्लान', price: 499, credits: 20, note: '20 connections, 2 job posts / month', plan: 'basic' },
    { id: 'pro', title: 'Pro plan', titleHi: 'प्रो प्लान', price: 1499, credits: 0, note: 'Unlimited connections & job posts, Urgent boosts, bulk festive hiring', plan: 'pro' },
  ],
};

/**
 * Mock payment gateway. Replace the body with Razorpay Checkout:
 *   new window.Razorpay({ key, amount: amount*100, currency:'INR', handler: resolve }).open()
 */
export function processPayment({ amount }) {
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true, paymentId: uid('pay'), amount }), 1200));
}

export function applyPurchase(userId, pack) {
  const s = getState();
  const u = userById(s, userId);
  const patch = {};
  if (pack.plan) {
    patch.plan = { name: pack.plan, until: Date.now() + 30 * DAY };
    patch.credits = (u.credits || 0) + pack.credits;
  } else if (pack.boostJobId) {
    // handled by caller
  } else {
    patch.credits = (u.credits || 0) + pack.credits;
    patch.creditsExpiry = Date.now() + 60 * DAY;
  }
  updateUser(userId, patch);
  setState((st) => ({ transactions: [{ id: uid('t'), userId, amount: pack.price, credits: pack.credits, desc: pack.title, at: Date.now() }, ...st.transactions] }));
}

export function sendMessage(reqId, fromId, text) {
  const s = getState();
  const req = s.requests.find((r) => r.id === reqId);
  if (!req || !text.trim()) return;
  setState((st) => ({ messages: [...st.messages, { id: uid('m'), reqId, fromId, text: text.trim(), at: Date.now(), read: false }] }));
  const toId = req.fromId === fromId ? req.toId : req.fromId;
  const from = userById(s, fromId);
  notify(toId, `New message from ${from.name}`, `${from.name} का नया संदेश`, 'message', `/app/chat/${reqId}`);
  simulateBotReply(reqId, toId, text);
}

export function markChatRead(reqId, myId) {
  const s = getState();
  if (!s.messages.some((m) => m.reqId === reqId && m.fromId !== myId && !m.read)) return;
  setState((st) => ({ messages: st.messages.map((m) => (m.reqId === reqId && m.fromId !== myId ? { ...m, read: true } : m)) }));
}

export function markHired(reqId) {
  const s = getState();
  const req = s.requests.find((r) => r.id === reqId);
  const employer = employerOf(s, req); const worker = workerOf(s, req);
  const priorHire = s.requests.some((r) => r.id !== reqId && r.status === 'hired' && employerOf(s, r)?.id === employer.id && workerOf(s, r)?.id === worker.id);
  setState((st) => ({ requests: st.requests.map((r) => (r.id === reqId ? { ...r, status: 'hired', hiredAt: Date.now() } : r)) }));
  if (priorHire) updateUser(worker.id, { rehired: (worker.rehired || 0) + 1 });
  notify(worker.id, `${employer.name} marked you as hired 🎉`, `${employer.name} ने आपको काम पर रखा 🎉`, 'hired', `/app/chat/${reqId}`);
}

export function addReview({ reqId, employerId, workerId, stars, tags, text }) {
  const s = getState();
  const req = s.requests.find((r) => r.id === reqId);
  if (!req || !['accepted', 'hired'].includes(req.status) || employerOf(s, req)?.id !== employerId) throw new Error('Only employers with an accepted connection can review');
  if (s.reviews.some((r) => r.reqId === reqId)) throw new Error('Already reviewed');
  const employer = userById(s, employerId);
  setState((st) => ({ reviews: [{ id: uid('r'), reqId, workerId, employerId, reviewerName: employer.businessName || employer.name, stars, tags, text, createdAt: Date.now() }, ...st.reviews] }));
  notify(workerId, `${employer.name} gave you ${stars}★`, `${employer.name} ने आपको ${stars}★ दिए`, 'review', '/app/profile');
}

export function submitVerification(userId, kind, { idType, last4, image }) {
  setState((st) => ({
    verifications: [{ id: uid('v'), userId, kind, idType, last4: (last4 || '').slice(-4), image, status: 'pending', at: Date.now() }, ...st.verifications.filter((v) => !(v.userId === userId && v.kind === kind && v.status === 'pending'))],
    users: st.users.map((u) => (u.id === userId ? { ...u, ...(kind === 'id' ? { idStatus: 'pending', idType, idLast4: (last4 || '').slice(-4) } : { policeStatus: 'pending' }) } : u)),
  }));
}

export function reviewVerification(vId, approve, reason = '') {
  const s = getState();
  const v = s.verifications.find((x) => x.id === vId);
  const status = approve ? 'verified' : 'rejected';
  setState((st) => ({
    verifications: st.verifications.map((x) => (x.id === vId ? { ...x, status, reason, image: '' } : x)),
    users: st.users.map((u) => (u.id === v.userId ? { ...u, [v.kind === 'id' ? 'idStatus' : 'policeStatus']: status, verifyReason: reason } : u)),
  }));
  notify(v.userId, approve ? 'Your verification was approved ✅' : `Verification rejected: ${reason}`, approve ? 'आपका सत्यापन स्वीकृत हुआ ✅' : `सत्यापन अस्वीकृत: ${reason}`, 'verify', '/app/profile');
}

export function reportProfile(reporterId, targetId, reason) {
  setState((st) => ({ reports: [{ id: uid('rp'), reporterId, targetId, reason, status: 'open', at: Date.now() }, ...st.reports] }));
}

export function resolveReport(id, action) {
  const s = getState();
  const rp = s.reports.find((r) => r.id === id);
  setState((st) => ({ reports: st.reports.map((r) => (r.id === id ? { ...r, status: action } : r)) }));
  if (action === 'suspended') updateUser(rp.targetId, { suspended: true });
  if (action === 'warned') notify(rp.targetId, 'Warning: a report was received about your profile. Please follow community rules.', 'चेतावनी: आपकी प्रोफ़ाइल के बारे में शिकायत मिली है।', 'warn', '/app/profile');
}

export function postJob(employerId, job) {
  const s = getState();
  const e = userById(s, employerId);
  const id = uid('j');
  setState((st) => ({ jobs: [{ id, employerId, lat: e.lat, lng: e.lng, open: true, createdAt: Date.now(), ...job }, ...st.jobs] }));
  // "New nearby match" notifications for workers of that role within their travel distance
  s.users.filter((w) => w.role === 'worker' && w.primaryRole === job.role && haversine(w, e) <= prefsOf(s, w).maxDistance)
    .forEach((w) => notify(w.id, `New ${job.role} job near you: ${e.businessName}`, `आपके पास नई नौकरी: ${e.businessName}`, 'match', '/app/people'));
  return id;
}
export function boostJob(jobId) {
  setState((st) => ({ jobs: st.jobs.map((j) => (j.id === jobId ? { ...j, urgentUntil: Date.now() + 48 * 3600000 } : j)) }));
}
export function updateJob(jobId, patch) { setState((st) => ({ jobs: st.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)) })); }
export function deleteReview(id) { setState((st) => ({ reviews: st.reviews.filter((r) => r.id !== id) })); }

export function expireOldRequests() {
  const s = getState();
  const cutoff = Date.now() - 72 * 3600000;
  if (!s.requests.some((r) => r.status === 'pending' && r.createdAt < cutoff)) return;
  setState((st) => ({ requests: st.requests.map((r) => (r.status === 'pending' && r.createdAt < cutoff ? { ...r, status: 'expired', respondedAt: Date.now() } : r)) }));
}

export function clearPasses(userId) {
  setState((st) => ({ swipes: st.swipes.filter((w) => !(w.userId === userId && w.dir === 'left')) }));
}

// ---------- demo "other side" simulation ----------
// Seeded profiles that are not demo logins respond automatically, so a single
// tester can see the full flow. Demo accounts (w4, e1, e5) never auto-respond —
// log in as them (or use a second tab) to accept manually.
function isBot(id) { const u = userById(getState(), id); return u && !u.demo && /^(w|e)\d+$/.test(u.id); }

function simulateBotResponse(reqId) {
  const req = getState().requests.find((r) => r.id === reqId);
  if (!req || !isBot(req.toId)) return;
  setTimeout(() => {
    const r = getState().requests.find((x) => x.id === reqId);
    if (!r || r.status !== 'pending') return;
    const accept = Math.random() < 0.85;
    respondRequest(reqId, accept);
    if (accept) {
      const responder = userById(getState(), r.toId);
      setTimeout(() => sendBotMessage(reqId, responder.id, responder.role === 'worker' ? 'Namaste! Thank you for connecting. I am interested. When can we talk? 🙏' : 'Namaste! Your profile looks good. When can you come to meet?'), 1500);
    }
  }, 6000);
}

const BOT_REPLIES = [
  [/salary|pay|wage|वेतन|पैसे/i, 'My expected pay is as written in my profile, but we can discuss.'],
  [/monday|start|join|शुरू/i, 'Yes, I can start from Monday.'],
  [/live-in|daily|रहकर/i, 'Daily is better for me, but live-in is also possible.'],
  [/timing|time|समय/i, 'Morning 7 to 11 suits me best. Evening also possible.'],
];
function simulateBotReply(reqId, botId, text) {
  if (!isBot(botId)) return;
  const reply = (BOT_REPLIES.find(([re]) => re.test(text)) || [null, 'Okay ji, noted. 🙏'])[1];
  setTimeout(() => sendBotMessage(reqId, botId, reply), 2200);
}
function sendBotMessage(reqId, fromId, text) {
  setState((st) => ({ messages: [...st.messages, { id: uid('m'), reqId, fromId, text, at: Date.now(), read: false }] }));
  const req = getState().requests.find((r) => r.id === reqId);
  const toId = req.fromId === fromId ? req.toId : req.fromId;
  const from = userById(getState(), fromId);
  notify(toId, `New message from ${from.name}`, `${from.name} का नया संदेश`, 'message', `/app/chat/${reqId}`);
}
