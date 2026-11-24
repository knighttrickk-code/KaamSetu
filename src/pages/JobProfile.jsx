import { useMemo, useState } from 'react';
import { Briefcase, Home, Clock, CalendarDays, Wallet, Languages, Users, MapPin, ShieldCheck, Plus, Zap, Sparkles, Activity, Tag } from 'lucide-react';
import { useApp, rupee } from '../lib/useApp';
import { prefsOf, setPrefs, updateUser, feedFor, postJob, boostJob, updateJob, hasActivePlan, setState as _set } from '../lib/store';
import { ROLES, LANGUAGES } from '../i18n';
import { ChipSelect, Toggle, Sheet, Field, Toast } from '../components/ui';
import PaymentModal from '../components/PaymentModal';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="label !mb-0 text-base"><Icon size={18} />{title}</div>
      {children}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, format }) {
  return (
    <div>
      <div className="text-2xl font-extrabold text-saffron">{format(value)}</div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

const WORK_TYPES = (t) => [
  { value: 'any', label: t('any') }, { value: 'permanent', label: t('permanent') },
  { value: 'parttime', label: t('parttime') }, { value: 'temporary', label: t('temporary') }, { value: 'daily', label: t('daily') },
];

export default function JobProfile() {
  const { s, user, t } = useApp();
  const p = prefsOf(s, user);
  const count = useMemo(() => feedFor(s, user).length, [s, user]);
  const set = (patch) => setPrefs(user.id, patch);

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-cream/95 backdrop-blur">
        <div className="rounded-2xl bg-teal text-white px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold text-lg"><Sparkles size={20} />{t('matchesNear', { n: count })}</span>
          <span className="text-xs opacity-80">live</span>
        </div>
      </div>
      {user.role === 'worker' ? <WorkerPrefs p={p} set={set} /> : <EmployerPrefs p={p} set={set} />}
    </div>
  );
}

function EmployerPrefs({ p, set }) {
  const { t, user, s, roleLabel } = useApp();
  const roleOpts = [{ value: '', label: t('any'), icon: '👥' }, ...ROLES.map((r) => ({ value: r.key, label: roleLabel(r.key), icon: r.icon }))];
  const myJobs = s.jobs.filter((j) => j.employerId === user.id);
  const [postOpen, setPostOpen] = useState(false);
  const [boostFor, setBoostFor] = useState(null);
  const [upgrade, setUpgrade] = useState(false);
  const [toast, setToast] = useState('');

  const canPost = () => {
    if (user.role !== 'business') return true;
    if (user.plan?.name === 'pro' && hasActivePlan(user)) return true;
    const monthAgo = Date.now() - 30 * 86400000;
    const recent = myJobs.filter((j) => j.createdAt > monthAgo).length;
    return hasActivePlan(user) && recent < 2;
  };

  return (
    <>
      <Toast message={toast} onDone={() => setToast('')} />
      <Section icon={Briefcase} title={t('roleNeeded')}>
        <ChipSelect options={roleOpts} value={p.role} onChange={(v) => set({ role: v })} />
      </Section>
      <Section icon={Home} title={t('placeType')}>
        <ChipSelect options={[{ value: 'home', label: t('home'), icon: '🏠' }, { value: 'shop', label: t('shop'), icon: '🏪' }]} value={p.place} onChange={(v) => set({ place: v })} />
      </Section>
      <Section icon={Clock} title={t('preferredHours')}>
        <ChipSelect options={['Morning', 'Evening', 'Full day', 'Night', 'Live-in'].map((h) => ({ value: h, label: h }))} value={p.hours} onChange={(v) => set({ hours: v })} />
      </Section>
      <Section icon={CalendarDays} title={t('duration')}>
        <ChipSelect options={WORK_TYPES(t)} value={p.workType} onChange={(v) => set({ workType: v })} />
        <label className="block"><span className="label">{t('startDate')}</span>
          <input type="date" className="input" value={p.start} onChange={(e) => set({ start: e.target.value })} /></label>
      </Section>
      <Section icon={Wallet} title={`${t('budget')} (${t('perMonth')})`}>
        <Slider value={p.budgetMax} min={5000} max={40000} step={500} onChange={(v) => set({ budgetMax: Math.max(v, p.budgetMin) })} format={(v) => `${rupee(p.budgetMin)} – ${rupee(v)}`} />
        <input type="range" className="w-full" min={3000} max={30000} step={500} value={p.budgetMin} onChange={(e) => set({ budgetMin: Math.min(Number(e.target.value), p.budgetMax) })} aria-label="minimum budget" />
        <p className="text-xs text-slate-500">Top slider: max · bottom slider: min. Daily-wage workers are compared at 26 days.</p>
      </Section>
      <Section icon={Languages} title={t('languages')}>
        <ChipSelect multi options={LANGUAGES.map((l) => ({ value: l, label: l }))} value={p.languages} onChange={(v) => set({ languages: v })} />
      </Section>
      <Section icon={Users} title={t('genderPref')}>
        <ChipSelect options={[{ value: 'any', label: t('any') }, { value: 'F', label: t('female') }, { value: 'M', label: t('male') }]} value={p.gender} onChange={(v) => set({ gender: v })} />
      </Section>
      <Section icon={MapPin} title={t('maxDistance')}>
        <Slider value={p.maxDistance} min={1} max={100} step={1} onChange={(v) => set({ maxDistance: v })} format={(v) => `${v} km`} />
      </Section>
      <div className="card p-4"><Toggle icon={ShieldCheck} label={t('verifiedOnly')} checked={p.verifiedOnly} onChange={(v) => set({ verifiedOnly: v })} /></div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="label !mb-0 text-base"><Briefcase size={18} />My job posts</div>
          <button className="btn-primary !py-2 !min-h-0" onClick={() => (canPost() ? setPostOpen(true) : setUpgrade(true))}><Plus size={18} />{t('postJob')}</button>
        </div>
        {myJobs.length === 0 && <p className="text-slate-500 text-sm">Post a job and it will appear as a card and map pin for matching workers.</p>}
        {myJobs.map((j) => (
          <div key={j.id} className="rounded-2xl border p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold">{roleLabel(j.role)} · {rupee(j.pay)}</div>
              <div className="text-xs text-slate-500">{j.timings} · {j.open ? 'Open' : 'Closed'} {j.urgentUntil > Date.now() && <span className="text-red-600 font-bold">· URGENT</span>}</div>
            </div>
            <div className="flex gap-1">
              {j.open && !(j.urgentUntil > Date.now()) && <button className="chip-off !text-red-600" onClick={() => setBoostFor(j.id)}><Zap size={14} />₹49</button>}
              <button className="chip-off" onClick={() => updateJob(j.id, { open: !j.open })}>{j.open ? 'Close' : 'Reopen'}</button>
            </div>
          </div>
        ))}
      </div>

      <PostJobSheet open={postOpen} onClose={() => setPostOpen(false)} defaults={p} onPosted={(id, urgent) => { setToast('✅ Job posted'); if (urgent) setBoostFor(id); }} />
      <PaymentModal open={!!boostFor} onClose={() => setBoostFor(null)} title="Urgent boost"
        items={[{ id: 'boost', title: 'Urgent boost — 48 hours', titleHi: 'अर्जेंट बूस्ट — 48 घंटे', price: 49, credits: 0, note: 'Top of workers’ feed + highlighted red map pin', custom: true }]}
        onPaid={(pack) => { boostJob(boostFor); recordBoost(user.id, pack); setToast('⚡ Job boosted for 48 hours'); }} />
      <PaymentModal open={upgrade} onClose={() => setUpgrade(false)} title="Upgrade your plan" onPaid={() => setToast('Plan activated')} />
    </>
  );
}

function recordBoost(userId, pack) {
  _set((st) => ({ transactions: [{ id: `t_${Date.now()}`, userId, amount: pack.price, credits: 0, desc: 'Urgent job boost (48h)', at: Date.now() }, ...st.transactions] }));
}

function PostJobSheet({ open, onClose, defaults, onPosted }) {
  const { t, user, roleLabel } = useApp();
  const [f, setF] = useState({ role: defaults.role || 'maid', place: defaults.place || 'home', timings: '9 AM – 5 PM', workType: 'permanent', pay: 10000, payType: 'month', description: '', urgent: false });
  const u = (patch) => setF((x) => ({ ...x, ...patch }));
  const submit = () => {
    const { urgent, ...job } = f;
    const id = postJob(user.id, job);
    onClose(); onPosted(id, urgent);
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('postJob')}>
      <div className="space-y-4">
        <div><span className="label">{t('roleNeeded')}</span>
          <ChipSelect options={ROLES.map((r) => ({ value: r.key, label: roleLabel(r.key), icon: r.icon }))} value={f.role} onChange={(v) => u({ role: v })} /></div>
        <div><span className="label">{t('placeType')}</span>
          <ChipSelect options={[{ value: 'home', label: t('home') }, { value: 'shop', label: t('shop') }]} value={f.place} onChange={(v) => u({ place: v })} /></div>
        <Field label={t('timings')} icon={Clock} value={f.timings} onChange={(v) => u({ timings: v })} />
        <div><span className="label">{t('duration')}</span>
          <ChipSelect options={WORK_TYPES(t).slice(1)} value={f.workType} onChange={(v) => u({ workType: v })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="label"><Wallet size={16} />{t('payOffered')}</span><input type="number" className="input" value={f.pay} onChange={(e) => u({ pay: Number(e.target.value) })} /></label>
          <div><span className="label">{t('payType')}</span><ChipSelect options={[{ value: 'month', label: t('monthly') }, { value: 'day', label: t('dailyRate') }]} value={f.payType} onChange={(v) => u({ payType: v })} /></div>
        </div>
        <Field label={t('description')} icon={Tag} textarea value={f.description} onChange={(v) => u({ description: v })} />
        <div className="rounded-2xl bg-red-50 p-3"><Toggle icon={Zap} label={t('urgentBoost')} checked={f.urgent} onChange={(v) => u({ urgent: v })} /></div>
        <button className="btn-primary w-full" onClick={submit}>{t('postJob')}</button>
      </div>
    </Sheet>
  );
}

function WorkerPrefs({ p, set }) {
  const { t, user, roleLabel } = useApp();
  const [skillInput, setSkillInput] = useState('');
  const addSkill = () => {
    const v = skillInput.trim(); if (!v) return;
    const skills = Array.from(new Set([...(user.skills || []), v]));
    updateUser(user.id, { skills }); set({ skills }); setSkillInput('');
  };
  return (
    <>
      <div className={`card p-5 ${user.available ? 'bg-emerald-50 ring-2 ring-emerald-400' : ''}`}>
        <Toggle icon={Activity} label={t('activelyAvailable')} checked={!!user.available} onChange={(v) => updateUser(user.id, { available: v })} />
      </div>
      <Section icon={Briefcase} title={t('categories')}>
        <ChipSelect multi options={ROLES.map((r) => ({ value: r.key, label: roleLabel(r.key), icon: r.icon }))} value={p.categories} onChange={(v) => set({ categories: v })} />
      </Section>
      <Section icon={Sparkles} title={t('skillsOffered')}>
        <div className="flex flex-wrap gap-2">
          {(user.skills || []).map((sk) => (
            <button key={sk} onClick={() => updateUser(user.id, { skills: user.skills.filter((x) => x !== sk) })} className="chip-on">{sk} ✕</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Field value={skillInput} onChange={setSkillInput} placeholder="e.g. Tiffin, Ironing" />
          <button onClick={addSkill} className="btn-teal !px-4"><Plus /></button>
        </div>
      </Section>
      <Section icon={Wallet} title={t('expectedPay')}>
        <ChipSelect options={[{ value: 'month', label: t('monthly') }, { value: 'day', label: t('dailyRate') }]} value={user.wageType || 'month'} onChange={(v) => updateUser(user.id, { wageType: v, wage: v === 'day' ? 600 : 10000 })} />
        {user.wageType === 'day'
          ? <Slider value={user.wage || 600} min={200} max={2000} step={50} onChange={(v) => updateUser(user.id, { wage: v })} format={(v) => `${rupee(v)}${t('perDay')}`} />
          : <Slider value={user.wage || 10000} min={5000} max={40000} step={500} onChange={(v) => updateUser(user.id, { wage: v })} format={(v) => `${rupee(v)}${t('perMonth')}`} />}
      </Section>
      <Section icon={MapPin} title={t('travelDistance')}>
        <Slider value={p.maxDistance} min={1} max={100} step={1} onChange={(v) => set({ maxDistance: v })} format={(v) => `${v} km`} />
      </Section>
      <Section icon={CalendarDays} title={t('workPref')}>
        <ChipSelect options={WORK_TYPES(t)} value={user.workType || 'any'} onChange={(v) => { updateUser(user.id, { workType: v }); set({ workType: v }); }} />
      </Section>
      <Section icon={Clock} title={t('preferredHours')}>
        <ChipSelect options={['Morning', 'Evening', 'Full day', 'Night', 'Live-in'].map((h) => ({ value: h, label: h }))} value={p.hours} onChange={(v) => set({ hours: v })} />
      </Section>
    </>
  );
}
