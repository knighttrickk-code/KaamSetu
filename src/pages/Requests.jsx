import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, MapPin, Clock, Inbox, Send, MessageCircle } from 'lucide-react';
import { useApp, rupee, timeAgo } from '../lib/useApp';
import { respondRequest, otherParty, ratingOf, employerStats, locOf } from '../lib/store';
import { haversine, fmtKm } from '../lib/geo';
import { Avatar, Stars, SpeakButton, Empty, Badges } from '../components/ui';
import { badgesOf } from '../lib/store';

export default function Requests() {
  const { s, user, t } = useApp();
  const [tab, setTab] = useState('received');
  const received = s.requests.filter((r) => r.toId === user.id).sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || b.createdAt - a.createdAt);
  const sent = s.requests.filter((r) => r.fromId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const chats = s.requests.filter((r) => (r.fromId === user.id || r.toId === user.id) && ['accepted', 'hired'].includes(r.status))
    .map((r) => {
      const msgs = s.messages.filter((m) => m.reqId === r.id);
      const last = msgs[msgs.length - 1];
      return { r, last, unread: msgs.filter((m) => m.fromId !== user.id && !m.read).length };
    })
    .sort((a, b) => (b.last?.at || b.r.respondedAt || 0) - (a.last?.at || a.r.respondedAt || 0));

  const tabs = [
    { k: 'received', label: t('received'), icon: Inbox, n: received.filter((r) => r.status === 'pending').length },
    { k: 'sent', label: t('sent'), icon: Send, n: 0 },
    { k: 'chats', label: t('chats'), icon: MessageCircle, n: chats.reduce((a, c) => a + c.unread, 0) },
  ];

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 bg-cream px-4 pt-3 pb-2">
        <h1 className="text-2xl font-extrabold text-teal mb-3">{t('requests')}</h1>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 shadow-sm">
          {tabs.map(({ k, label, icon: Icon, n }) => (
            <button key={k} onClick={() => setTab(k)} className={`relative flex items-center justify-center gap-1.5 rounded-xl py-3 font-semibold text-sm ${tab === k ? 'bg-teal text-white' : 'text-slate-600'}`}>
              <Icon size={16} />{label}
              {n > 0 && <span className="ml-1 min-w-[20px] h-5 px-1 rounded-full bg-saffron text-white text-xs flex items-center justify-center">{n}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 space-y-3 mt-2">
        {tab === 'received' && (received.length === 0 ? <Empty icon="📭" title={t('noRequests')} /> : received.map((r) => <ReceivedCard key={r.id} r={r} />))}
        {tab === 'sent' && (sent.length === 0 ? <Empty icon="📤" title={t('noRequests')} /> : sent.map((r) => <SentRow key={r.id} r={r} />))}
        {tab === 'chats' && (chats.length === 0 ? <Empty icon="💬" title={t('noChats')} /> : chats.map(({ r, last, unread }) => {
          const o = otherParty(s, r, user.id);
          return (
            <Link key={r.id} to={`/app/chat/${r.id}`} className="card p-3 flex items-center gap-3">
              <Avatar src={o.photo} name={o.name} size={56} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between"><b className="truncate">{o.role === 'worker' ? o.name : o.businessName || o.name}</b><span className="text-xs text-slate-400">{last ? timeAgo(last.at) : ''}</span></div>
                <p className={`text-sm truncate ${unread ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{last ? last.text : '👋 Say hello'}</p>
                {r.status === 'hired' && <span className="text-xs font-bold text-teal">✅ {t('hired')}</span>}
              </div>
              {unread > 0 && <span className="min-w-[24px] h-6 px-1.5 rounded-full bg-saffron text-white text-xs font-bold flex items-center justify-center">{unread}</span>}
            </Link>
          );
        }))}
      </div>
    </div>
  );
}

function offerText(s, r, o, t, roleLabel) {
  const job = r.jobId && s.jobs.find((j) => j.id === r.jobId);
  if (job) return { role: roleLabel(job.role), pay: `${rupee(job.pay)}${job.payType === 'day' ? t('perDay') : t('perMonth')}`, timings: job.timings };
  if (o.role === 'worker') return { role: roleLabel(o.primaryRole), pay: `${rupee(o.wage)}${o.wageType === 'day' ? t('perDay') : t('perMonth')}`, timings: o.workType };
  const anyJob = s.jobs.find((j) => j.employerId === o.id && j.open);
  return anyJob ? { role: roleLabel(anyJob.role), pay: `${rupee(anyJob.pay)}${t('perMonth')}`, timings: anyJob.timings } : { role: o.businessType, pay: '', timings: '' };
}

function ReceivedCard({ r }) {
  const { s, user, t, lang, roleLabel } = useApp();
  const nav = useNavigate();
  const o = otherParty(s, r, user.id);
  const dist = haversine(locOf(user), o);
  const offer = offerText(s, r, o, t, roleLabel);
  const rating = o.role === 'worker' ? ratingOf(s, o.id).avg : employerStats(s, o.id).rating;
  const displayName = o.role === 'worker' ? o.name : `${o.name}, ${o.businessName}`;
  const speech = lang === 'hi'
    ? `${displayName} ने आपको ${offer.role} के काम के लिए अनुरोध भेजा है। ${offer.pay ? 'वेतन ' + offer.pay.replace('₹', '') + ' रुपये।' : ''} ${offer.timings ? 'समय ' + offer.timings : ''}। दूरी ${fmtKm(dist)}।`
    : `${displayName} sent you a request for ${offer.role} work. ${offer.pay ? 'Pay ' + offer.pay + '.' : ''} ${offer.timings ? 'Timings ' + offer.timings + '.' : ''} Distance ${fmtKm(dist)}.`;
  const pending = r.status === 'pending';
  const hoursLeft = Math.max(0, Math.ceil(72 - (Date.now() - r.createdAt) / 3600000));
  return (
    <div className={`card p-4 space-y-3 ${pending ? '' : 'opacity-60'}`}>
      <div className="flex gap-3">
        <Avatar src={o.photo} name={o.name} size={64} />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-lg truncate">{o.role === 'worker' ? o.name : o.businessName}</div>
          <div className="text-sm text-slate-600">{o.role === 'worker' ? `${offer.role}` : `${o.name} · ${o.businessType}`}</div>
          <div className="flex items-center gap-3 text-sm text-slate-500"><span className="flex items-center gap-1"><MapPin size={14} />{fmtKm(dist)}</span><Stars value={rating} size={14} /></div>
        </div>
      </div>
      <Badges list={badgesOf(s, o)} small />
      <div className="rounded-2xl bg-saffron-50 p-3 text-sm space-y-1">
        <div>💼 <b>{offer.role}</b></div>
        {offer.pay && <div>💰 {offer.pay}</div>}
        {offer.timings && <div>🕒 {offer.timings}</div>}
      </div>
      <div className="flex items-center justify-between">
        <SpeakButton text={speech} />
        {pending ? <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} />{hoursLeft}h left · {timeAgo(r.createdAt, lang)}</span>
          : <span className="text-sm font-semibold">{({ accepted: t('accepted'), declined: t('declined'), expired: t('expired'), hired: t('hired') })[r.status]}</span>}
      </div>
      {pending && (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn !bg-red-50 !text-red-600 text-lg" onClick={() => respondRequest(r.id, false)}><X size={22} />{t('decline')}</button>
          <button className="btn !bg-emerald-500 !text-white text-lg" onClick={() => { respondRequest(r.id, true); nav(`/app/chat/${r.id}`); }}><Check size={22} />{t('accept')}</button>
        </div>
      )}
      {['accepted', 'hired'].includes(r.status) && <Link to={`/app/chat/${r.id}`} className="btn-teal w-full"><MessageCircle size={18} />{t('chats')}</Link>}
    </div>
  );
}

function SentRow({ r }) {
  const { s, user, t, lang } = useApp();
  const o = otherParty(s, r, user.id);
  const st = {
    pending: ['⏳ ' + t('pending'), 'bg-amber-100 text-amber-800'],
    accepted: ['✅ ' + t('accepted'), 'bg-emerald-100 text-emerald-800'],
    hired: ['🎉 ' + t('hired'), 'bg-teal text-white'],
    declined: ['🙏 ' + t('declined'), 'bg-slate-100 text-slate-600'],
    expired: ['⌛ ' + t('expired'), 'bg-slate-100 text-slate-500'],
  }[r.status];
  const body = (
    <div className="card p-3 flex items-center gap-3">
      <Avatar src={o.photo} name={o.name} size={52} />
      <div className="flex-1 min-w-0">
        <b className="truncate block">{o.role === 'worker' ? o.name : o.businessName}</b>
        <span className="text-xs text-slate-500">{timeAgo(r.createdAt, lang)}</span>
      </div>
      <span className={`chip border-0 text-xs ${st[1]}`}>{st[0]}</span>
    </div>
  );
  return ['accepted', 'hired'].includes(r.status) ? <Link to={`/app/chat/${r.id}`}>{body}</Link> : body;
}
