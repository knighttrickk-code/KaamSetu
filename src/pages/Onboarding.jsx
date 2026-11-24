import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Building2, Phone, LocateFixed, MapPin, Camera, Briefcase } from 'lucide-react';
import { useApp, rupee } from '../lib/useApp';
import { createUser, setPrefs } from '../lib/store';
import { ROLES, LANGUAGES } from '../i18n';
import { AREAS, MATHURA, getGps } from '../lib/geo';
import { readImage } from '../lib/image';
import { PhoneFrame, LangToggle } from '../components/AppShell';
import { Field, ChipSelect, Toggle, Avatar } from '../components/ui';

export default function Onboarding() {
  const { t, roleLabel } = useApp();
  const nav = useNavigate();
  const [q] = useSearchParams();
  const preset = q.get('role');
  const [step, setStep] = useState(preset === 'worker' ? 1 : 0);
  const [f, setF] = useState({
    role: preset === 'worker' ? 'worker' : preset === 'employer' ? 'household' : '',
    name: '', age: '', gender: 'F', primaryRole: 'maid', phone: q.get('phone') || '', email: q.get('email') || '',
    businessName: '', businessType: '', photo: '', languages: ['Hindi'], experience: 1,
    wage: 10000, wageType: 'month', available: true, categories: [], maxDistance: 10,
    needRole: '', budgetMax: 20000, lat: null, lng: null, area: '', city: '',
  });
  const [gpsMsg, setGpsMsg] = useState('');
  const fileRef = useRef(null);
  const u = (p) => setF((x) => ({ ...x, ...p }));
  const isWorker = f.role === 'worker';

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    u({ photo: await readImage(file) });
  };

  const gps = async () => {
    setGpsMsg(t('loading'));
    try { const p = await getGps(); u({ ...p, area: 'My location', city: '' }); setGpsMsg('📍 Location found'); }
    catch { u({ ...MATHURA, area: 'Central', city: 'Mathura' }); setGpsMsg('GPS denied — using central Mathura. You can pick your area below.'); }
  };

  const finish = () => {
    const loc = f.lat != null ? { lat: f.lat, lng: f.lng } : MATHURA;
    const common = { role: f.role, name: f.name.trim(), phone: f.phone, email: f.email, photo: f.photo, languages: f.languages, ...loc, area: f.area || 'Central', city: f.city || 'Mathura' };
    const id = isWorker
      ? createUser({ ...common, age: Number(f.age) || '', gender: f.gender, primaryRole: f.primaryRole, experience: Number(f.experience), wage: f.wage, wageType: f.wageType, workType: f.wageType === 'day' ? 'daily' : 'permanent', available: f.available, skills: [] })
      : createUser({ ...common, businessName: f.businessName || `${f.name.split(' ').slice(-1)[0]} Family`, businessType: f.businessType || (f.role === 'business' ? 'Shop' : 'Household') });
    setPrefs(id, isWorker
      ? { categories: f.categories.length ? f.categories : [f.primaryRole], maxDistance: f.maxDistance, workType: 'any', hours: '' }
      : { role: f.needRole, place: f.role === 'business' ? 'shop' : 'home', budgetMin: 5000, budgetMax: f.budgetMax, maxDistance: f.maxDistance, workType: 'any', languages: [], gender: 'any', verifiedOnly: false, hours: '', start: '' });
    nav('/app/people', { replace: true });
  };

  const steps = 4;
  const canNext = [!!f.role, f.name.trim().length > 1 && /^\d{10}$/.test(f.phone), true, f.lat != null][step];

  return (
    <PhoneFrame>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => (step === 0 || (preset === 'worker' && step === 1) ? nav(-1) : setStep(step - 1))} className="p-2 -ml-2" aria-label="back"><ArrowLeft /></button>
          <div className="flex gap-1.5">{Array.from({ length: steps }).map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i <= step ? 'w-8 bg-saffron' : 'w-4 bg-slate-200'}`} />)}</div>
          <LangToggle />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {step === 0 && (
            <>
              <h1 className="text-2xl font-extrabold text-teal">{t('chooseRole')}</h1>
              {[
                { v: 'worker', icon: '👷', label: t('iAmWorker') },
                { v: 'household', icon: '🏠', label: t('iAmHousehold') },
                { v: 'business', icon: '🏪', label: t('iAmBusiness') },
              ].filter((o) => preset !== 'employer' || o.v !== 'worker').map((o) => (
                <button key={o.v} onClick={() => u({ role: o.v })} className={`w-full card p-5 flex items-center gap-4 border-2 ${f.role === o.v ? 'border-saffron bg-saffron-50' : 'border-transparent'}`}>
                  <span className="text-4xl">{o.icon}</span><b className="text-lg">{o.label}</b>
                </button>
              ))}
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-2xl font-extrabold text-teal">{t('profile')}</h1>
              <div className="flex justify-center">
                <button onClick={() => fileRef.current?.click()} className="relative">
                  <Avatar src={f.photo} name={f.name || '?'} size={96} />
                  <span className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-saffron text-white flex items-center justify-center"><Camera size={18} /></span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
              </div>
              <Field label={t('name')} icon={User} value={f.name} onChange={(v) => u({ name: v })} />
              <Field label={t('phone')} icon={Phone} type="tel" value={f.phone} onChange={(v) => u({ phone: v.replace(/\D/g, '').slice(0, 10) })} voice={false} placeholder="10-digit mobile" />
              {isWorker ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t('age')} type="number" value={f.age} onChange={(v) => u({ age: v })} voice={false} />
                    <Field label={t('yrsExp')} type="number" value={f.experience} onChange={(v) => u({ experience: v })} voice={false} />
                  </div>
                  <div><span className="label">{t('gender')}</span><ChipSelect options={[{ value: 'F', label: t('female') }, { value: 'M', label: t('male') }, { value: 'O', label: t('other') }]} value={f.gender} onChange={(v) => u({ gender: v })} /></div>
                  <div><span className="label"><Briefcase size={16} />Main work</span><ChipSelect options={ROLES.map((r) => ({ value: r.key, label: roleLabel(r.key), icon: r.icon }))} value={f.primaryRole} onChange={(v) => u({ primaryRole: v, wageType: ['plumber', 'electrician'].includes(v) ? 'day' : 'month', wage: ['plumber', 'electrician'].includes(v) ? 600 : 10000 })} /></div>
                </>
              ) : (
                <>
                  <Field label={t('businessName')} icon={Building2} value={f.businessName} onChange={(v) => u({ businessName: v })} />
                  {f.role === 'business' && <Field label={t('businessType')} value={f.businessType} onChange={(v) => u({ businessType: v })} placeholder="Sweet shop, clinic, showroom…" />}
                </>
              )}
              <div><span className="label">{t('languages')}</span><ChipSelect multi options={LANGUAGES.map((l) => ({ value: l, label: l }))} value={f.languages} onChange={(v) => u({ languages: v })} /></div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-extrabold text-teal">{t('jobProfile')}</h1>
              {isWorker ? (
                <>
                  <div className="card p-4"><Toggle label={t('activelyAvailable')} checked={f.available} onChange={(v) => u({ available: v })} /></div>
                  <div><span className="label">{t('categories')}</span><ChipSelect multi options={ROLES.map((r) => ({ value: r.key, label: roleLabel(r.key), icon: r.icon }))} value={f.categories.length ? f.categories : [f.primaryRole]} onChange={(v) => u({ categories: v })} /></div>
                  <div><span className="label">{t('expectedPay')}</span>
                    <div className="text-2xl font-extrabold text-saffron">{rupee(f.wage)}{f.wageType === 'day' ? t('perDay') : t('perMonth')}</div>
                    <input type="range" className="w-full" min={f.wageType === 'day' ? 200 : 5000} max={f.wageType === 'day' ? 2000 : 40000} step={f.wageType === 'day' ? 50 : 500} value={f.wage} onChange={(e) => u({ wage: Number(e.target.value) })} /></div>
                </>
              ) : (
                <>
                  <div><span className="label">{t('roleNeeded')}</span><ChipSelect options={[{ value: '', label: t('any'), icon: '👥' }, ...ROLES.map((r) => ({ value: r.key, label: roleLabel(r.key), icon: r.icon }))]} value={f.needRole} onChange={(v) => u({ needRole: v })} /></div>
                  <div><span className="label">{t('budget')}</span>
                    <div className="text-2xl font-extrabold text-saffron">up to {rupee(f.budgetMax)}{t('perMonth')}</div>
                    <input type="range" className="w-full" min={5000} max={40000} step={500} value={f.budgetMax} onChange={(e) => u({ budgetMax: Number(e.target.value) })} /></div>
                </>
              )}
              <div><span className="label">{t('maxDistance')}</span>
                <div className="text-2xl font-extrabold text-saffron">{f.maxDistance} km</div>
                <input type="range" className="w-full" min={1} max={100} value={f.maxDistance} onChange={(e) => u({ maxDistance: Number(e.target.value) })} /></div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-extrabold text-teal">📍 {t('allowLocation')}</h1>
              <p className="text-slate-600">{t('locationWhy')}</p>
              <button className="btn-primary w-full text-lg" onClick={gps}><LocateFixed />{t('allowLocation')}</button>
              {gpsMsg && <p className="text-sm text-center text-teal font-semibold">{gpsMsg}</p>}
              <p className="label pt-2"><MapPin size={16} />{t('pickArea')}</p>
              <div className="grid grid-cols-1 gap-2">
                {AREAS.map((a) => (
                  <button key={a.name} onClick={() => u({ lat: a.lat, lng: a.lng, area: a.name.split(',')[0], city: a.name.split(', ')[1] || a.name })} className={`text-left rounded-2xl border-2 px-4 py-3 font-semibold ${f.area === a.name.split(',')[0] ? 'border-saffron bg-saffron-50' : 'border-slate-200 bg-white'}`}>{a.name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          {step < steps - 1
            ? <button className="btn-primary w-full text-lg" disabled={!canNext} onClick={() => setStep(step + 1)}>{t('continue')}</button>
            : <button className="btn-primary w-full text-lg" disabled={!canNext} onClick={finish}>{t('getStarted')} →</button>}
        </div>
      </div>
    </PhoneFrame>
  );
}
