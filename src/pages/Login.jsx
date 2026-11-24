import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Mail, KeyRound, HardHat, Home, Store, Shield, UserPlus, ArrowLeft } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { login } from '../lib/store';
import { sendOtp, verifyOtp, isSupabaseConfigured } from '../lib/supabase';
import { PhoneFrame, LangToggle, Logo } from '../components/AppShell';
import { Sheet } from '../components/ui';

export default function Login() {
  const { s, t } = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState('phone');
  const [value, setValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const demo = (id) => { login(id); nav(id === 'admin' ? '/admin' : '/app/people'); };

  const send = async () => {
    setErr(''); setBusy(true);
    try { await sendOtp(mode === 'phone' ? { phone: value } : { email: value }); setOtpSent(true); }
    catch (e) { setErr(e.message || t('error')); }
    setBusy(false);
  };
  const verify = async () => {
    setErr(''); setBusy(true);
    try {
      await verifyOtp(mode === 'phone' ? { phone: value, token: otp } : { email: value, token: otp });
      const existing = s.users.find((u) => (mode === 'phone' ? u.phone === value : u.email === value));
      if (existing) { login(existing.id); nav(existing.role === 'admin' ? '/admin' : '/app/people'); }
      else nav(`/onboarding?${mode}=${encodeURIComponent(value)}`);
    } catch (e) { setErr(e.message || t('error')); }
    setBusy(false);
  };

  const valid = mode === 'phone' ? /^\d{10}$/.test(value) : /\S+@\S+\.\S+/.test(value);

  return (
    <PhoneFrame>
      <div className="h-full overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="p-2 -ml-2" aria-label="back"><ArrowLeft /></Link>
          <LangToggle />
        </div>
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <Logo />
          <p className="mt-2 text-slate-600">{t('tagline')}</p>
        </div>

        <div className="card p-5 space-y-4">
          {!otpSent ? (
            <>
              <label className="block">
                <span className="label">{mode === 'phone' ? <Phone size={16} /> : <Mail size={16} />}{mode === 'phone' ? t('phone') : t('email')}</span>
                <div className="flex gap-2">
                  {mode === 'phone' && <span className="input !w-auto flex items-center font-semibold text-slate-600">+91</span>}
                  <input className="input text-lg" inputMode={mode === 'phone' ? 'numeric' : 'email'} value={value} placeholder={mode === 'phone' ? '98XXXXXXXX' : 'you@example.com'}
                    onChange={(e) => setValue(mode === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)} />
                </div>
              </label>
              <button className="btn-primary w-full text-lg" disabled={!valid || busy} onClick={send}>{busy ? t('loading') : t('sendOtp')}</button>
            </>
          ) : (
            <>
              <label className="block">
                <span className="label"><KeyRound size={16} />{t('otp')}</span>
                <input className="input text-center text-2xl tracking-[0.6em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
              </label>
              <button className="btn-primary w-full text-lg" disabled={otp.length !== 6 || busy} onClick={verify}>{busy ? t('loading') : t('verify')}</button>
              <button className="btn-ghost w-full" onClick={() => { setOtpSent(false); setOtp(''); }}>{t('back')}</button>
            </>
          )}
          {!isSupabaseConfigured && <p className="text-center text-sm text-saffron-700 bg-saffron-50 rounded-xl py-2">🔑 {t('demoOtp')}</p>}
          {err && <p className="text-center text-sm text-red-600">{err}</p>}
          {!otpSent && <button className="w-full text-sm font-semibold text-teal underline" onClick={() => { setMode(mode === 'phone' ? 'email' : 'phone'); setValue(''); }}>{mode === 'phone' ? t('useEmail') : t('usePhone')}</button>}
        </div>

        <button className="btn-outline w-full mt-4 text-lg" onClick={() => setCreateOpen(true)}><UserPlus />{t('createProfile')}</button>

        <div className="mt-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-3">— {t('tryDemo')} —</p>
          <div className="grid grid-cols-2 gap-3">
            <DemoBtn icon={HardHat} label={t('demoWorker')} sub="Ramesh · Cook" onClick={() => demo('w4')} />
            <DemoBtn icon={Home} label={t('demoHousehold')} sub="Priya · Agrawal family" onClick={() => demo('e1')} />
            <DemoBtn icon={Store} label={t('demoBusiness')} sub="Saree showroom" onClick={() => demo('e5')} />
            <DemoBtn icon={Shield} label={t('demoAdmin')} sub="Admin panel" onClick={() => demo('admin')} />
          </div>
        </div>
      </div>

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title={t('createProfile')}>
        <div className="space-y-3">
          <button className="w-full card p-5 flex items-center gap-4 text-left border-2 border-transparent hover:border-saffron" onClick={() => nav('/onboarding?role=worker')}>
            <span className="text-4xl">👷</span><div><b className="text-lg">{t('createWorker')}</b><p className="text-sm text-slate-500">{t('lookingForWork')}</p></div>
          </button>
          <button className="w-full card p-5 flex items-center gap-4 text-left border-2 border-transparent hover:border-saffron" onClick={() => nav('/onboarding?role=employer')}>
            <span className="text-4xl">🏠</span><div><b className="text-lg">{t('createEmployer')}</b><p className="text-sm text-slate-500">{t('iWantToHire')}</p></div>
          </button>
        </div>
      </Sheet>
    </PhoneFrame>
  );
}

function DemoBtn({ icon: Icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="card p-4 flex flex-col items-center gap-1 active:scale-95 transition">
      <span className="h-12 w-12 rounded-full bg-saffron-50 text-saffron flex items-center justify-center"><Icon /></span>
      <b>{label}</b><span className="text-xs text-slate-500">{sub}</span>
    </button>
  );
}
