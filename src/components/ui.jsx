// Small shadcn-style UI kit built on Tailwind + framer-motion.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, X, Star, ShieldCheck, BadgeCheck, Award, Repeat, Volume2 } from 'lucide-react';
import { useApp } from '../lib/useApp';

export function Avatar({ src, name, size = 48, className = '' }) {
  const [err, setErr] = useState(false);
  const initials = (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('');
  if (!src || err) {
    return <div style={{ width: size, height: size }} className={`rounded-full bg-teal-100 text-teal font-bold flex items-center justify-center shrink-0 ${className}`}>{initials}</div>;
  }
  return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: size, height: size }} className={`rounded-full object-cover shrink-0 ${className}`} />;
}

export function Stars({ value = 0, size = 16, count }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      <b>{value ? value.toFixed(1) : 'New'}</b>
      {count != null && <span className="text-slate-500 text-sm">({count})</span>}
    </span>
  );
}

const BADGE_META = {
  idVerified: { icon: BadgeCheck, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  policeVerified: { icon: ShieldCheck, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  recommended: { icon: Award, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  rehired: { icon: Repeat, cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};
export function Badges({ list, small }) {
  const { t } = useApp();
  if (!list?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((b) => {
        const M = BADGE_META[b]; const Icon = M.icon;
        return <span key={b} className={`chip ${M.cls} ${small ? 'text-xs px-2 py-0.5' : ''}`}><Icon size={small ? 12 : 14} />{t(b)}</span>;
      })}
    </div>
  );
}

/** Render overlays at the phone-frame root so they are never clipped by scrolling. */
function Portal({ children }) {
  const root = typeof document !== 'undefined' && (document.getElementById('frame-root') || document.body);
  return root ? createPortal(children, root) : children;
}
const overlayPos = () => (document.getElementById('frame-root') ? 'absolute' : 'fixed');

export function Sheet({ open, onClose, children, title }) {
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className={`${overlayPos()} inset-0 z-[1000] flex items-end`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div className="relative w-full max-h-[90%] overflow-y-auto bg-white rounded-t-3xl p-5 pb-8" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
            {title && (
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-teal">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100" aria-label="close"><X /></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}

export function Modal({ open, onClose, children, title }) {
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className={`${overlayPos()} inset-0 z-[1100] flex items-center justify-center p-4`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div className="relative w-full max-w-sm bg-white rounded-3xl p-5 max-h-[90%] overflow-y-auto" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-teal">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100" aria-label="close"><X /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}

export function Toast({ message, onDone }) {
  useEffect(() => { if (message) { const id = setTimeout(onDone, 2500); return () => clearTimeout(id); } }, [message, onDone]);
  return (
    <Portal><AnimatePresence>
      {message && (
        <motion.div className="absolute left-4 right-4 top-20 z-[1200] rounded-2xl bg-teal text-white px-4 py-3 text-center font-semibold shadow-lg" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
          {message}
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}

export function Empty({ icon = '🔍', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-3">
      <div className="text-6xl">{icon}</div>
      <p className="text-lg font-semibold text-teal">{title}</p>
      {children}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-64 w-full" />
      <div className="skeleton h-6 w-2/3" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

/** 🎤 Voice input using the Web Speech API (hi-IN / en-IN). */
export function VoiceButton({ onText, big }) {
  const { speechLang, t } = useApp();
  const [on, setOn] = useState(false);
  const recRef = useRef(null);
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggle = () => {
    if (!SR) { alert(t('voiceUnsupported')); return; }
    if (on) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = speechLang; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => onText(e.results[0][0].transcript);
    rec.onend = () => setOn(false);
    rec.onerror = () => setOn(false);
    recRef.current = rec; rec.start(); setOn(true);
  };
  return (
    <button type="button" onClick={toggle} aria-label="voice input"
      className={`shrink-0 rounded-full flex items-center justify-center transition ${on ? 'bg-red-500 text-white animate-pulse' : 'bg-saffron-50 text-saffron'} ${big ? 'h-14 w-14' : 'h-12 w-12'}`}>
      {on ? <MicOff size={big ? 26 : 20} /> : <Mic size={big ? 26 : 20} />}
    </button>
  );
}

/** Text input / textarea with a voice button. */
export function Field({ label, icon: Icon, value, onChange, textarea, type = 'text', placeholder, voice = true, ...rest }) {
  const Comp = textarea ? 'textarea' : 'input';
  return (
    <label className="block">
      {label && <span className="label">{Icon && <Icon size={16} />}{label}</span>}
      <div className="flex gap-2 items-start">
        <Comp className={`input ${textarea ? 'min-h-[96px]' : ''}`} type={type} value={value ?? ''} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} {...rest} />
        {voice && type === 'text' && <VoiceButton onText={(txt) => onChange(textarea && value ? `${value} ${txt}` : txt)} />}
      </div>
    </label>
  );
}

export function speak(text, lang) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function SpeakButton({ text }) {
  const { speechLang, t } = useApp();
  return (
    <button type="button" onClick={() => speak(text, speechLang)} className="chip-off !border-teal-100 !text-teal">
      <Volume2 size={16} /> {t('listen')}
    </button>
  );
}

export function Toggle({ checked, onChange, label, icon: Icon }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 font-semibold text-slate-700">{Icon && <Icon size={18} className="text-teal" />}{label}</span>
      <span className={`relative h-8 w-14 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </span>
    </button>
  );
}

export function ChipSelect({ options, value, onChange, multi }) {
  const isOn = (v) => (multi ? value.includes(v) : value === v);
  const click = (v) => {
    if (multi) onChange(isOn(v) ? value.filter((x) => x !== v) : [...value, v]);
    else onChange(v);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button type="button" key={o.value} onClick={() => click(o.value)} className={`${isOn(o.value) ? 'chip-on' : 'chip-off'} min-h-[40px]`}>
          {o.icon && <span>{o.icon}</span>}{o.label}
        </button>
      ))}
    </div>
  );
}
