import { useState } from 'react';
import { MapPin, Briefcase, Languages, Wallet, Clock, Flag, Store, Home, Users, Calendar, Zap } from 'lucide-react';
import { useApp, rupee, timeAgo } from '../lib/useApp';
import { ratingOf, badgesOf, employerStats, reportProfile } from '../lib/store';
import { fmtKm } from '../lib/geo';
import { roleOf } from '../i18n';
import { Badges, Stars, Modal } from './ui';

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <Icon size={20} className="text-saffron mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-base text-slate-800">{children}</div>
      </div>
    </div>
  );
}

function Photo({ src, name, children }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative h-[62%] min-h-[300px] w-full overflow-hidden rounded-t-3xl bg-gradient-to-br from-teal-100 to-saffron-100">
      {src && !err ? (
        <img src={src} alt={name} draggable={false} onError={() => setErr(true)} className="h-full w-full object-cover pointer-events-none select-none" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-7xl font-bold text-teal/40">{(name || '?')[0]}</div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      {children}
    </div>
  );
}

export function ReportLink({ targetId }) {
  const { t, user } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const reasons = ['Fake profile', 'Asked for money in advance', 'Rude or abusive behaviour', 'Wrong information'];
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-4 flex items-center gap-2 text-sm text-red-600 font-semibold py-2"><Flag size={16} />{t('reportProfile')}</button>
      <Modal open={open} onClose={() => { setOpen(false); setDone(false); }} title={t('report')}>
        {done ? <p className="text-center py-4">✅ {t('reportSent')}</p> : (
          <div className="space-y-3">
            <p className="font-semibold">{t('reportReason')}</p>
            {reasons.map((r) => (
              <button key={r} onClick={() => setReason(r)} className={`w-full text-left ${reason === r ? 'chip-on' : 'chip-off'} !rounded-2xl !py-3`}>{r}</button>
            ))}
            <button disabled={!reason} className="btn-primary w-full !bg-red-600" onClick={() => { reportProfile(user?.id, targetId, reason); setDone(true); }}>{t('report')}</button>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Full card — photo + name first, scroll for details. */
export default function ProfileCard({ card, stamp }) {
  const { t, s, lang, roleLabel } = useApp();
  if (card.kind === 'job') return <JobCard card={card} stamp={stamp} />;
  const u = card.user;
  const r = card.rating || ratingOf(s, u.id);
  const badges = badgesOf(s, u);
  const wp = { permanent: t('permanent'), parttime: t('parttime'), daily: t('daily'), temporary: t('temporary') }[u.workType] || u.workType;
  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar bg-white rounded-3xl shadow-card" style={{ touchAction: 'pan-y' }}>
      <Photo src={u.photo} name={u.name}>
        {stamp}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ring-2 ring-white ${u.available ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <span className="text-sm">{u.available ? t('available') : t('notAvailable')}</span>
          </div>
          <h2 className="text-3xl font-extrabold leading-tight">{u.name}{u.age ? <span className="font-normal">, {u.age}</span> : null}</h2>
          <p className="text-lg font-semibold">{roleOf(u.primaryRole).icon} {roleLabel(u.primaryRole)}</p>
          <p className="flex items-center gap-1 text-sm opacity-90"><MapPin size={14} />{fmtKm(card.distance)} {t('away')} · {u.area}, {u.city}</p>
        </div>
      </Photo>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Stars value={r.avg} count={r.count} size={18} />
          <span className="text-lg font-bold text-teal">{rupee(u.wage)}<span className="text-sm font-normal text-slate-500">{u.wageType === 'day' ? t('perDay') : t('perMonth')}</span></span>
        </div>
        <Badges list={badges} />
        <div>
          <Row icon={Briefcase} label={t('yrsExp')}>{u.experience} {lang === 'hi' ? 'साल' : 'years'}</Row>
          <Row icon={Clock} label={t('workPref')}>{wp}</Row>
          <Row icon={Wallet} label={t('expectedWage')}>{rupee(u.wage)} {u.wageType === 'day' ? t('perDay') : t('perMonth')}</Row>
          <Row icon={Languages} label={t('languages')}>{(u.languages || []).join(', ')}</Row>
        </div>
        {u.skills?.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{t('skills')}</div>
            <div className="flex flex-wrap gap-2">{u.skills.map((sk) => <span key={sk} className="chip bg-saffron-50 text-saffron-700 border-saffron-100">{sk}</span>)}</div>
          </div>
        )}
        {u.description && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t('about')}</div>
            <p className="text-base leading-relaxed">{u.description}</p>
          </div>
        )}
        {u.pastJobs?.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t('pastJobs')}</div>
            <ul className="list-disc pl-5 space-y-1">{u.pastJobs.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{t('reviews')} ({r.count})</div>
          <div className="space-y-2">
            {r.list.slice(0, 6).map((rv) => (
              <div key={rv.id} className="rounded-2xl bg-cream p-3">
                <div className="flex items-center justify-between text-sm"><b>{rv.reviewerName}</b><span>{'★'.repeat(rv.stars)}<span className="text-slate-300">{'★'.repeat(5 - rv.stars)}</span></span></div>
                {rv.text && <p className="text-sm mt-1">{rv.text}</p>}
                {rv.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{rv.tags.map((tg) => <span key={tg} className="text-xs bg-white rounded-full px-2 py-0.5 border">{tg}</span>)}</div>}
                <div className="text-xs text-slate-400 mt-1">{timeAgo(rv.createdAt, lang)}</div>
              </div>
            ))}
          </div>
        </div>
        <ReportLink targetId={u.id} />
        <div className="h-24" />
      </div>
    </div>
  );
}

function JobCard({ card, stamp }) {
  const { t, s, roleLabel } = useApp();
  const { job, user: e } = card;
  const st = employerStats(s, e.id);
  const wp = { permanent: t('permanent'), parttime: t('parttime'), daily: t('daily'), temporary: t('temporary') }[job.workType] || job.workType;
  const role = roleOf(job.role);
  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar bg-white rounded-3xl shadow-card" style={{ touchAction: 'pan-y' }}>
      <Photo src={e.photo} name={e.businessName}>
        {stamp}
        {card.urgent && <span className="absolute top-4 left-4 chip bg-red-600 text-white border-red-600"><Zap size={14} />URGENT</span>}
        {card.roleMatch && <span className="absolute top-4 right-4 chip bg-emerald-500 text-white border-emerald-500">✓ Match</span>}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-lg font-semibold">{role.icon} {roleLabel(job.role)}</p>
          <h2 className="text-3xl font-extrabold leading-tight">{e.businessName}</h2>
          <p className="flex items-center gap-1 text-sm opacity-90"><MapPin size={14} />{fmtKm(card.distance)} {t('away')} · {e.area}, {e.city}</p>
        </div>
      </Photo>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Stars value={st.rating} size={18} />
          <span className="text-lg font-bold text-teal">{rupee(job.pay)}<span className="text-sm font-normal text-slate-500">{job.payType === 'day' ? t('perDay') : t('perMonth')}</span></span>
        </div>
        <Badges list={badgesOf(s, e)} />
        <div>
          <Row icon={Briefcase} label={t('roleNeeded')}>{roleLabel(job.role)}</Row>
          <Row icon={job.place === 'home' ? Home : Store} label={t('placeType')}>{job.place === 'home' ? t('home') : t('shop')} · {e.businessType}</Row>
          <Row icon={Clock} label={t('timings')}>{job.timings}</Row>
          <Row icon={Calendar} label={t('duration')}>{wp}</Row>
          <Row icon={Wallet} label={t('payOffered')}>{rupee(job.pay)} {job.payType === 'day' ? t('perDay') : t('perMonth')}</Row>
          <Row icon={Users} label={t('pastHires')}>{st.hires} {t('pastHires')} · {e.name}</Row>
        </div>
        {job.description && <p className="text-base leading-relaxed rounded-2xl bg-cream p-3">{job.description}</p>}
        <ReportLink targetId={e.id} />
        <div className="h-24" />
      </div>
    </div>
  );
}
