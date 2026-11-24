import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Send, Lock, BadgeCheck, Star } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { sendMessage, markChatRead, otherParty, employerOf, workerOf, markHired, unlockPhone, addReview, isEmployer } from '../lib/store';
import { REVIEW_TAGS } from '../i18n';
import { Avatar, VoiceButton, Modal, Empty, Toast } from '../components/ui';
import PaymentModal from '../components/PaymentModal';

const QUICK = {
  employer: ['What is your expected salary?', 'Can you start Monday?', 'Live-in or daily?', 'What are the timings?'],
  employerHi: ['आपका अपेक्षित वेतन क्या है?', 'क्या आप सोमवार से शुरू कर सकते हैं?', 'साथ रहकर या रोज़ाना?', 'समय क्या रहेगा?'],
  worker: ['What will be the timings?', 'What is the salary?', 'When can I come to meet?', 'Is food provided?'],
  workerHi: ['समय क्या रहेगा?', 'वेतन कितना है?', 'मिलने कब आऊं?', 'क्या खाना मिलेगा?'],
};

export default function Chat() {
  const { id } = useParams();
  const nav = useNavigate();
  const { s, user, t, lang } = useApp();
  const req = s.requests.find((r) => r.id === id);
  const [text, setText] = useState('');
  const [pay, setPay] = useState(false);
  const [rate, setRate] = useState(false);
  const [toast, setToast] = useState('');
  const bottom = useRef(null);
  const msgs = s.messages.filter((m) => m.reqId === id);

  useEffect(() => { if (req) markChatRead(id, user.id); }, [msgs.length, id]); // eslint-disable-line
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  if (!req || !['accepted', 'hired'].includes(req.status) || (req.fromId !== user.id && req.toId !== user.id)) {
    return <div className="h-full flex flex-col"><button onClick={() => nav('/app/requests')} className="p-4"><ArrowLeft /></button><Empty icon="🔒" title="This chat is not available" /></div>;
  }

  const other = otherParty(s, req, user.id);
  const iAmEmployer = isEmployer(user);
  const worker = workerOf(s, req);
  const employer = employerOf(s, req);
  const reviewed = s.reviews.some((r) => r.reqId === id);
  const hiredDaysAgo = req.hiredAt ? (Date.now() - req.hiredAt) / 86400000 : 0;
  const quick = QUICK[(iAmEmployer ? 'employer' : 'worker') + (lang === 'hi' ? 'Hi' : '')];
  const phoneDigits = (worker?.phone || '').replace(/\D/g, '');

  const send = (txt) => { sendMessage(id, user.id, txt ?? text); setText(''); };

  return (
    <div className="h-full flex flex-col bg-[#F3EFE8]">
      <Toast message={toast} onDone={() => setToast('')} />
      <div className="bg-teal text-white px-2 py-2 flex items-center gap-2 shadow">
        <button onClick={() => nav('/app/requests')} className="p-2" aria-label="back"><ArrowLeft /></button>
        <Avatar src={other.photo} name={other.name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{other.role === 'worker' ? other.name : other.businessName || other.name}</div>
          <div className="text-xs opacity-80">{req.status === 'hired' ? `✅ ${t('hired')}` : `✅ ${t('accepted')}`}</div>
        </div>
      </div>

      {/* Employer-only contact strip */}
      {iAmEmployer && (
        <div className="bg-white px-3 py-3 border-b space-y-2">
          {req.phoneRevealed ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 font-bold text-teal">📞 +91 {worker.phone}</span>
              <a href={`tel:+91${phoneDigits}`} className="btn-teal !py-2 !min-h-[44px] !px-3"><Phone size={16} />{t('call')}</a>
              <a href={`https://wa.me/91${phoneDigits}`} target="_blank" rel="noreferrer" className="btn !py-2 !min-h-[44px] !px-3 bg-[#25D366] text-white">WhatsApp</a>
            </div>
          ) : (
            <button className="btn-primary w-full" onClick={() => (unlockPhone(id) ? setToast('📞 Phone unlocked') : setPay(true))}><Lock size={18} />{t('unlockPhone')}</button>
          )}
          {req.status === 'accepted' && <button className="btn-outline w-full !min-h-[44px] !py-2" onClick={() => { markHired(id); setToast('🎉 Marked as hired'); }}><BadgeCheck size={18} />{t('markHired')}</button>}
          {req.status === 'hired' && !reviewed && (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm flex items-center gap-2">
              <Star className="text-amber-500 shrink-0" />
              <span className="flex-1">{hiredDaysAgo >= 30 ? `It's been a month! How is ${worker.name}?` : `We'll remind you in 30 days to rate ${worker.name}.`}</span>
              <button className="btn-primary !py-2 !min-h-0 !px-3" onClick={() => setRate(true)}>{t('rateNow')}</button>
            </div>
          )}
          {reviewed && <p className="text-xs text-emerald-700 font-semibold">⭐ Thanks for your review!</p>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-center text-xs text-slate-500 bg-white/70 rounded-full py-1 px-3 mx-auto w-fit">🔒 Never pay advance money. Meet in safe places first.</p>
        {msgs.map((m) => {
          const mine = m.fromId === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-base shadow-sm ${mine ? 'bg-saffron text-white rounded-br-md' : 'bg-white rounded-bl-md'}`}>
                {m.text}
                <div className={`text-[10px] mt-1 text-right ${mine ? 'text-white/80' : 'text-slate-400'}`}>{new Date(m.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="bg-white border-t px-2 pt-2 pb-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {quick.map((q) => <button key={q} onClick={() => send(q)} className="chip-off shrink-0 !border-saffron-100 !text-saffron-700">{q}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-center">
          <input className="input !rounded-full" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('typeMessage')} />
          <VoiceButton onText={(v) => setText((x) => (x ? `${x} ${v}` : v))} />
          <button type="submit" disabled={!text.trim()} className="h-12 w-12 shrink-0 rounded-full bg-teal text-white flex items-center justify-center disabled:opacity-40" aria-label="send"><Send size={20} /></button>
        </form>
      </div>

      <PaymentModal open={pay} onClose={() => setPay(false)} title={t('unlockPhone')} onPaid={() => { unlockPhone(id); setToast('📞 Phone unlocked'); }} />
      <RateModal open={rate} onClose={() => setRate(false)} worker={worker} onSubmit={(data) => {
        try { addReview({ reqId: id, employerId: employer.id, workerId: worker.id, ...data }); setRate(false); setToast('⭐ Review submitted'); }
        catch (e) { setToast(e.message); }
      }} />
    </div>
  );
}

function RateModal({ open, onClose, worker, onSubmit }) {
  const { t } = useApp();
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState([]);
  const [text, setText] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={t('rateWorker')}>
      <div className="space-y-4 text-center">
        <Avatar src={worker?.photo} name={worker?.name} size={72} className="mx-auto" />
        <b className="text-lg">{worker?.name}</b>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`}><Star size={40} className={n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} /></button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {REVIEW_TAGS.map((tg) => (
            <button key={tg} onClick={() => setTags(tags.includes(tg) ? tags.filter((x) => x !== tg) : [...tags, tg])} className={tags.includes(tg) ? 'chip-on' : 'chip-off'}>{tg}</button>
          ))}
        </div>
        <textarea className="input min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a few words (optional)" />
        <button className="btn-primary w-full" onClick={() => onSubmit({ stars, tags, text })}>{t('submit')}</button>
      </div>
    </Modal>
  );
}
