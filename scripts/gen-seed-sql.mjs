// Generates supabase/seed.sql from the same demo data the app uses.
// Run: npm run seed:sql
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildSeed } from '../src/lib/seed.js';

const s = buildSeed();
// Deterministic UUIDs from the short demo ids (w1, e1, j1 …)
const U = (id) => { const h = createHash('md5').update(`kaamsetu-${id}`).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const q = (v) => (v === null || v === undefined || v === '' ? 'null' : typeof v === 'number' ? v : typeof v === 'boolean' ? v : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${(a || []).map(q).join(',')}]::text[]`;
const ts = (ms) => (ms ? `to_timestamp(${Math.round(ms / 1000)})` : 'null');

const out = ['-- KaamSetu demo seed (generated). Run after schema.sql.', 'begin;'];
for (const u of s.users) {
  out.push(`insert into profiles (id, role, name, photo_url, age, gender, description, languages, area, city, lat, lng, id_status, police_status, views, referral_code, created_at) values (${q(U(u.id))}, ${q(u.role)}, ${q(u.name)}, ${q(u.photo)}, ${q(u.age)}, ${q(u.gender)}, ${q(u.description)}, ${arr(u.languages)}, ${q(u.area)}, ${q(u.city)}, ${q(u.lat)}, ${q(u.lng)}, ${q(u.idStatus || 'none')}, ${q(u.policeStatus || 'none')}, ${q(u.views || 0)}, ${q(u.referralCode)}, ${ts(u.createdAt)});`);
  if (u.phone) out.push(`insert into private_contacts values (${q(U(u.id))}, ${q(u.phone)});`);
  if (u.role === 'worker') {
    out.push(`insert into worker_profiles values (${q(U(u.id))}, ${q(u.primaryRole)}, ${u.experience}, ${u.wage}, ${q(u.wageType)}, ${q(u.workType)}, ${arr(u.pastJobs)}, ${u.available}, ${u.rehired || 0}, null);`);
    for (const sk of u.skills || []) {
      out.push(`insert into skills (name) values (${q(sk)}) on conflict do nothing;`);
      out.push(`insert into worker_skills select ${q(U(u.id))}, id from skills where name = ${q(sk)} on conflict do nothing;`);
    }
  } else if (u.role !== 'admin') {
    out.push(`insert into employer_profiles values (${q(U(u.id))}, ${q(u.businessName)}, ${q(u.businessType)}, ${!!u.freeUsed}, ${q(u.plan?.name)}, ${ts(u.plan?.until)});`);
    out.push(`insert into credits values (${q(U(u.id))}, ${u.credits || 0}, null);`);
  }
}
for (const [id, p] of Object.entries(s.prefs)) out.push(`insert into job_preferences (profile_id, prefs) values (${q(U(id))}, ${q(JSON.stringify(p))}::jsonb);`);
for (const j of s.jobs) out.push(`insert into jobs values (${q(U(j.id))}, ${q(U(j.employerId))}, ${q(j.role)}, ${q(j.place)}, ${q(j.timings)}, ${q(j.workType)}, ${j.pay}, ${q(j.payType)}, ${q(j.description)}, ${j.lat}, ${j.lng}, true, ${ts(j.urgentUntil)}, ${ts(j.createdAt)});`);
for (const r of s.requests) {
  out.push(`insert into connection_requests values (${q(U(r.id))}, ${q(U(r.fromId))}, ${q(U(r.toId))}, ${r.jobId ? q(U(r.jobId)) : 'null'}, ${q(r.status)}, ${!!r.phoneRevealed}, ${ts(r.createdAt)}, ${ts(r.respondedAt)}, null);`);
  if (['accepted', 'hired'].includes(r.status)) out.push(`insert into conversations (id, request_id) values (${q(U('c' + r.id))}, ${q(U(r.id))});`);
}
for (const m of s.messages) out.push(`insert into messages (conversation_id, sender_id, body, read, created_at) values (${q(U('c' + m.reqId))}, ${q(U(m.fromId))}, ${q(m.text)}, ${m.read}, ${ts(m.at)});`);
for (const r of s.reviews) out.push(`insert into reviews (worker_id, reviewer_name, stars, tags, body, created_at) values (${q(U(r.workerId))}, ${q(r.reviewerName)}, ${r.stars}, ${arr(r.tags)}, ${q(r.text)}, ${ts(r.createdAt)});`);
for (const v of s.verifications) out.push(`insert into verifications (profile_id, kind, id_type, id_last4, status, created_at) values (${q(U(v.userId))}, ${q(v.kind)}, ${q(v.idType)}, ${q(v.last4)}, 'pending', ${ts(v.at)});`);
for (const r of s.reports) out.push(`insert into reports (reporter_id, target_id, reason, created_at) values (${q(U(r.reporterId))}, ${q(U(r.targetId))}, ${q(r.reason)}, ${ts(r.at)});`);
for (const t of s.transactions) out.push(`insert into transactions (profile_id, amount_inr, credits, description, created_at) values (${q(U(t.userId))}, ${t.amount}, ${t.credits}, ${q(t.desc)}, ${ts(t.at)});`);
for (const n of s.notifications) out.push(`insert into notifications (profile_id, type, body, body_hi, link, read, created_at) values (${q(U(n.userId))}, ${q(n.type)}, ${q(n.text)}, ${q(n.textHi)}, ${q(n.link)}, ${n.read}, ${ts(n.at)});`);
out.push('commit;');
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n') + '\n');
console.log(`seed.sql written: ${out.length} statements`);
