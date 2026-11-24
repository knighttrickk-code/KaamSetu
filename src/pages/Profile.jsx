import { useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, Pencil, Camera, ShieldCheck, Bookmark, History, Star, Wallet, Gift, Settings, LogOut, ChevronRight, User, FileText, Building2, Languages as LangIcon, Bell, Copy, RefreshCcw, Briefcase } from 'lucide-react';
import { useApp, rupee, timeAgo } from '../lib/useApp';
import { updateUser, logout, setLang, ratingOf, badgesOf, submitVerification, userById, otherParty, creditLabel, hasActivePlan, resetDemo, locOf } from '../lib/store';
import { haversine } from '../lib/geo';
import { LANGUAGES } from '../i18n';
import { Avatar, Badges, Sheet, Field, ChipSelect, Toggle, Toast, Stars, Empty } from '../components/ui';
import ProfileCard from '../components/ProfileCard';
import { readImage as readFile } from '../lib/image';
import PaymentModal from '../components/PaymentModal';

function completeness(u) {
  const checks = u.role === 'worker'
    ? [u.photo, u.name, u.age, u.description, u.skills?.length, u.languages?.length, u.wage, u.experience != null, u.idStatus !== 'none', u.lat]
    : [u.photo, u.name, u.businessName, u.description, u.languages?.length, u.lat, u.idStatus !== 'none'];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function Item({ icon: Icon, label, value, onClick, color = 'text-teal' }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 border-b border-slate-100 last:border-0 text-left active:bg-slate-50">
      <span className={`h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center ${color}`}><Icon size={20} /></span>
      <span className="flex-1 font-semibold">{label}</span>
      {value != null && <span className="text-sm text-slate-500">{value}</span>}
      <ChevronRight size={18} className="text-slate-400" />
    </button>
  );
}

export default function Profile() {
  const { s, user, t, lang } = useApp();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const [pay, setPay] = useState(false);
  const fileRef = useRef(null);
  const pct = completeness(user);
  const r = ratingOf(s, user.id);
  const isWorker = user.role === 'worker';
  const mySaved = s.saved.filter((x) => x.userId === user.id);
  const myReqs = s.requests.filter((q) => q.fromId === user.id || q.toId === user.id);
  const myTx = s.transactions.filter((x) => x.userId === user.id);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    updateUser(user.id, { photo: await readFile(f) }); setToast('📷 ' + t('saved'));
  };

  const previewCard = useMemo(() => (isWorker
    ? { kind: 'worker', id: user.id, user, distance: 1.2, rating: r }
    : { kind: 'job', id: 'preview', user, distance: 1.2, job: s.jobs.find((j) => j.employerId === user.id) || { role: s.prefs[user.id]?.role || 'maid', place: user.role === 'business' ? 'shop' : 'home', timings: '—', workType: 'permanent', pay: 0, payType: 'month', description: user.description } }), [user, s, isWorker, r]);

  return (
    <div className="p-4 space-y-4 pb-8">
      <Toast message={toast} onDone={() => setToast('')} />
      <div className="card p-5 flex items-center gap-4">
        <div className="relative">
          <Avatar src={user.photo} name={user.name} size={84} />
          <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-saffron text-white flex items-center justify-center shadow" aria-label="photo"><Camera size={18} /></button>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold truncate">{user.name}</h2>
          <p className="text-slate-600 text-sm">{isWorker ? '👷 Worker' : user.role === 'business' ? `🏪 ${user.businessName}` : `🏠 ${user.businessName || 'Household'}`}</p>
          {isWorker && <Stars value={r.avg} count={r.count} />}
          <div className="mt-1"><Badges list={badgesOf(s, user)} small /></div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-between text-sm font-semibold mb-2"><span>{t('completeness')}</span><span className="text-saffron">{pct}%</span></div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-saffron to-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn-outline" onClick={() => setSheet('preview')}><Eye size={18} />{t('previewProfile')}</button>
        <button className="btn-primary" onClick={() => setSheet('edit')}><Pencil size={18} />{t('editProfile')}</button>
      </div>

      {isWorker ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center"><div className="text-3xl font-extrabold text-teal">{user.views || 0}</div><div className="text-sm text-slate-500">👁 {t('profileViews')}</div></div>
          <button className="card p-4 text-center" onClick={() => setSheet('referral')}><div className="text-3xl">🎁</div><div className="text-sm font-semibold text-saffron">{t('referral')}</div></button>
        </div>
      ) : (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">{t('wallet')}</div>
            <div className="text-3xl font-extrabold text-teal">{creditLabel(user)} <span className="text-base font-semibold">{t('credits')}</span></div>
            {user.role === 'household' && !user.freeUsed && <div className="text-xs text-emerald-600 font-semibold">🎉 {t('firstFree')}</div>}
            {hasActivePlan(user) && <div className="text-xs text-teal font-semibold">Plan: {user.plan.name.toUpperCase()} · till {new Date(user.plan.until).toLocaleDateString('en-IN')}</div>}
          </div>
          <button className="btn-primary" onClick={() => setPay(true)}><Wallet size={18} />{t('buyCredits')}</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <Item icon={ShieldCheck} label={t('verification')} value={user.idStatus === 'verified' ? '✅' : user.idStatus === 'pending' ? '⏳' : ''} onClick={() => setSheet('verify')} />
        <Item icon={Bookmark} label={t('savedProfiles')} value={mySaved.length} onClick={() => setSheet('saved')} />
        <Item icon={History} label={t('history')} value={myReqs.length} onClick={() => setSheet('history')} />
        {isWorker && <Item icon={Star} label={t('reviewsReceived')} value={r.count} onClick={() => setSheet('reviews')} />}
        {!isWorker && <Item icon={Wallet} label={t('transactions')} value={myTx.length} onClick={() => setSheet('tx')} />}
        <Item icon={Settings} label={t('settings')} onClick={() => setSheet('settings')} />
      </div>
      <button className="btn-ghost w-full !text-red-600" onClick={() => { logout(); nav('/'); }}><LogOut size={18} />{t('logout')}</button>

      {/* Sheets */}
      <Sheet open={sheet === 'preview'} onClose={() => setSheet(null)} title={t('previewProfile')}>
        <div className="h-[560px]"><ProfileCard card={previewCard} /></div>
      </Sheet>
      <Sheet open={sheet === 'edit'} onClose={() => setSheet(null)} title={t('editProfile')}>
        <EditForm onSaved={() => { setSheet(null); setToast('✅ ' + t('saved')); }} />
      </Sheet>
      <Sheet open={sheet === 'verify'} onClose={() => setSheet(null)} title={t('verification')}>
        <Verification onDone={() => { setSheet(null); setToast('⏳ Sent for verification'); }} />
      </Sheet>
      <Sheet open={sheet === 'saved'} onClose={() => setSheet(null)} title={t('savedProfiles')}>
        {mySaved.length === 0 ? <Empty icon="⭐" title="Nothing saved yet" /> : mySaved.map((x) => {
          const job = s.jobs.find((j) => j.id === x.targetId);
          const u = job ? userById(s, job.employerId) : userById(s, x.targetId);
          if (!u) return null;
          return <PersonRow key={x.targetId} u={u} sub={job ? `${job.role} · ${rupee(job.pay)}` : `${u.primaryRole} · ${rupee(u.wage)}`} right={`${haversine(locOf(user), job || u).toFixed(1)} km`} />;
        })}
      </Sheet>
      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title={t('history')}>
        {myReqs.length === 0 ? <Empty icon="🤝" title={t('noRequests')} /> : [...myReqs].sort((a, b) => b.createdAt - a.createdAt).map((q) => {
          const o = otherParty(s, q, user.id);
          const statusTxt = { pending: t('pending'), accepted: t('accepted'), declined: t('declined'), expired: t('expired'), hired: t('hired') }[q.status];
          const color = { pending: 'bg-amber-100 text-amber-800', accepted: 'bg-emerald-100 text-emerald-800', hired: 'bg-teal text-white', declined: 'bg-slate-100 text-slate-600', expired: 'bg-slate-100 text-slate-500' }[q.status];
          return (
            <Link key={q.id} to={['accepted', 'hired'].includes(q.status) ? `/app/chat/${q.id}` : '/app/requests'}>
              <PersonRow u={o} sub={`${q.fromId === user.id ? '→ Sent' : '← Received'} · ${timeAgo(q.createdAt, lang)}`} right={<span className={`chip border-0 text-xs ${color}`}>{statusTxt}</span>} />
            </Link>
          );
        })}
      </Sheet>
      <Sheet open={sheet === 'reviews'} onClose={() => setSheet(null)} title={t('reviewsReceived')}>
        {r.list.length === 0 ? <Empty icon="⭐" title="No reviews yet" /> : r.list.map((rv) => (
          <div key={rv.id} className="rounded-2xl bg-cream p-3 mb-2">
            <div className="flex justify-between"><b>{rv.reviewerName}</b><span className="text-amber-500">{'★'.repeat(rv.stars)}</span></div>
            <p className="text-sm">{rv.text}</p>
            <div className="flex gap-1 mt-1">{rv.tags?.map((tg) => <span key={tg} className="text-xs bg-white border rounded-full px-2">{tg}</span>)}</div>
          </div>
        ))}
      </Sheet>
      <Sheet open={sheet === 'tx'} onClose={() => setSheet(null)} title={t('transactions')}>
        {myTx.length === 0 ? <Empty icon="🧾" title="No transactions yet" /> : myTx.map((x) => (
          <div key={x.id} className="flex items-center justify-between py-3 border-b">
            <div><div className="font-semibold">{x.desc}</div><div className="text-xs text-slate-500">{new Date(x.at).toLocaleString('en-IN')}</div></div>
            <div className="text-right"><div className="font-bold">{x.amount ? rupee(x.amount) : '—'}</div><div className={`text-xs ${x.credits < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{x.credits > 0 ? '+' : ''}{x.credits} {t('credits')}</div></div>
          </div>
        ))}
      </Sheet>
      <Sheet open={sheet === 'referral'} onClose={() => setSheet(null)} title={t('referral')}>
        <div className="space-y-4 text-center">
          <div className="text-6xl">🎁</div>
          <p className="font-semibold text-lg">{t('referralText')}</p>
          <div className="rounded-2xl border-2 border-dashed border-saffron p-4 text-2xl font-extrabold tracking-widest text-saffron">{user.referralCode}</div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-outline" onClick={() => { navigator.clipboard?.writeText(user.referralCode); setToast('Copied'); }}><Copy size={18} />Copy</button>
            <a className="btn-primary !bg-[#25D366]" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Join KaamSetu — find work directly, no agency commission! Use my code ${user.referralCode}: ${window.location.origin}`)}`}>WhatsApp</a>
          </div>
          <p className="text-sm text-slate-500">{s.referrals.filter((x) => x.referrerId === user.id).length}/3 friends joined</p>
        </div>
      </Sheet>
      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} title={t('settings')}>
        <div className="space-y-4">
          <div><span className="label"><LangIcon size={16} />{t('language')}</span>
            <ChipSelect options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिंदी' }]} value={lang} onChange={setLang} /></div>
          <Toggle icon={Bell} label={t('notifSetting')} checked={user.notifOn !== false} onChange={(v) => updateUser(user.id, { notifOn: v })} />
          <button className="btn-outline w-full" onClick={() => { resetDemo(); nav('/login'); }}><RefreshCcw size={18} />Reset demo data</button>
          <button className="btn-ghost w-full !text-red-600" onClick={() => { logout(); nav('/'); }}><LogOut size={18} />{t('logout')}</button>
        </div>
      </Sheet>
      <PaymentModal open={pay} onClose={() => setPay(false)} onPaid={() => setToast('✅ ' + t('paySuccess'))} />
    </div>
  );
}

function PersonRow({ u, sub, right }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100">
      <Avatar src={u?.photo} name={u?.name} size={48} />
      <div className="flex-1 min-w-0"><div className="font-bold truncate">{u?.businessName && u.role !== 'worker' ? u.businessName : u?.name}</div><div className="text-sm text-slate-500 truncate">{sub}</div></div>
      <div className="text-sm text-slate-500">{right}</div>
    </div>
  );
}

function EditForm({ onSaved }) {
  const { user, t } = useApp();
  const [f, setF] = useState({ name: user.name || '', age: user.age || '', description: user.description || '', businessName: user.businessName || '', businessType: user.businessType || '', languages: user.languages || [], experience: user.experience ?? '', pastJobs: (user.pastJobs || []).join('\n'), phone: user.phone || '' });
  const u = (p) => setF((x) => ({ ...x, ...p }));
  const isWorker = user.role === 'worker';
  const save = () => {
    updateUser(user.id, { ...f, age: Number(f.age) || f.age, experience: Number(f.experience) || 0, pastJobs: f.pastJobs.split('\n').map((x) => x.trim()).filter(Boolean) });
    onSaved();
  };
  return (
    <div className="space-y-4">
      <Field label={t('name')} icon={User} value={f.name} onChange={(v) => u({ name: v })} />
      {isWorker && <div className="grid grid-cols-2 gap-2">
        <Field label={t('age')} type="number" value={f.age} onChange={(v) => u({ age: v })} voice={false} />
        <Field label={t('yrsExp')} type="number" value={f.experience} onChange={(v) => u({ experience: v })} voice={false} />
      </div>}
      {!isWorker && <Field label={t('businessName')} icon={Building2} value={f.businessName} onChange={(v) => u({ businessName: v })} />}
      {!isWorker && <Field label={t('businessType')} icon={Briefcase} value={f.businessType} onChange={(v) => u({ businessType: v })} placeholder="Household / Sweet shop / Clinic…" />}
      <Field label={t('phone')} type="tel" value={f.phone} onChange={(v) => u({ phone: v })} voice={false} />
      <div>
        <span className="label"><FileText size={16} />{t('description')} 🎤</span>
        <p className="text-xs text-slate-500 mb-2">Tap the mic and speak — Hindi or English.</p>
        <Field textarea value={f.description} onChange={(v) => u({ description: v })} />
      </div>
      {isWorker && <Field label={t('pastJobs')} textarea value={f.pastJobs} onChange={(v) => u({ pastJobs: v })} placeholder="One per line" />}
      <div><span className="label"><LangIcon size={16} />{t('languages')}</span>
        <ChipSelect multi options={LANGUAGES.map((l) => ({ value: l, label: l }))} value={f.languages} onChange={(v) => u({ languages: v })} /></div>
      <button className="btn-primary w-full" onClick={save}>{t('saveChanges')}</button>
    </div>
  );
}

function Verification({ onDone }) {
  const { user, t } = useApp();
  const [idType, setIdType] = useState('Aadhaar');
  const [last4, setLast4] = useState('');
  const [img, setImg] = useState('');
  const [policeImg, setPoliceImg] = useState('');
  const status = (st) => ({ verified: '✅ Verified', pending: '⏳ Pending', rejected: '❌ Rejected', none: '—' }[st || 'none']);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-cream p-3"><div className="text-slate-500">{t('idVerified')}</div><b>{status(user.idStatus)}</b></div>
        <div className="rounded-2xl bg-cream p-3"><div className="text-slate-500">{t('policeVerified')}</div><b>{status(user.policeStatus)}</b></div>
      </div>
      {user.verifyReason && <p className="text-sm text-red-600">Reason: {user.verifyReason}</p>}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="label">{t('uploadId')}</div>
        <ChipSelect options={['Aadhaar', 'Voter ID', 'Driving Licence', 'PAN'].map((x) => ({ value: x, label: x }))} value={idType} onChange={setIdType} />
        <label className="block"><span className="label">{t('last4')}</span>
          <input className="input tracking-[0.5em] text-center text-xl" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="XXXX" /></label>
        <p className="text-xs text-slate-500">🔒 We never store your full Aadhaar number. The photo is visible only to KaamSetu admins.</p>
        <input type="file" accept="image/*" capture="environment" onChange={async (e) => e.target.files[0] && setImg(await readFile(e.target.files[0]))} className="block w-full text-sm" />
        <button className="btn-teal w-full" disabled={last4.length !== 4} onClick={() => { submitVerification(user.id, 'id', { idType, last4, image: img }); onDone(); }}>{t('submit')}</button>
      </div>
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="label">{t('policeCert')}</div>
        <input type="file" accept="image/*,application/pdf" onChange={async (e) => e.target.files[0] && setPoliceImg(e.target.files[0].type.startsWith('image') ? await readFile(e.target.files[0]) : 'pdf')} className="block w-full text-sm" />
        <button className="btn-outline w-full" disabled={!policeImg} onClick={() => { submitVerification(user.id, 'police', { idType: 'Police certificate', last4: '', image: policeImg }); onDone(); }}>{t('submit')}</button>
      </div>
    </div>
  );
}
