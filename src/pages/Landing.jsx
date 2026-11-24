import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, ShieldCheck, Award, Repeat, ChevronDown, Check, X, Heart, Users, Briefcase, Handshake, SlidersHorizontal, MessageCircle, Star } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { TESTIMONIALS } from '../lib/seed';
import { LangToggle, Logo } from '../components/AppShell';
import { ROLES } from '../i18n';

export default function Landing() {
  const { s, t, lang, user, roleLabel } = useApp();
  const nav = useNavigate();
  const go = (path) => nav(user ? '/app/people' : path);
  const stats = [
    { label: t('statWorkers'), value: s.users.filter((u) => u.role === 'worker').length, icon: Users },
    { label: t('statEmployers'), value: s.users.filter((u) => u.role === 'household' || u.role === 'business').length, icon: Briefcase },
    { label: t('statConnections'), value: s.requests.filter((r) => ['accepted', 'hired'].includes(r.status)).length + s.activity.reduce((a, w) => a + w.accepted, 0), icon: Handshake },
    { label: t('statJobs'), value: s.jobs.filter((j) => j.open).length, icon: Heart },
  ];
  const steps = [
    { icon: SlidersHorizontal, title: t('step1'), d: t('step1d') },
    { icon: Heart, title: t('step2'), d: t('step2d') },
    { icon: Handshake, title: t('step3'), d: t('step3d') },
    { icon: MessageCircle, title: t('step4'), d: t('step4d') },
  ];
  const cmp = [1, 2, 3, 4].map((i) => [t(`cmp${i}a`), t(`cmp${i}b`)]);
  const faqs = [1, 2, 3, 4].map((i) => [t(`faqQ${i}`), t(`faqA${i}`)]);

  return (
    <div className="min-h-full bg-cream">
      <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
          <Logo />
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link to={user ? '/app/people' : '/login'} className="btn-teal !py-2 !min-h-[40px]">{user ? t('people') : t('login')}</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="chip bg-saffron-50 text-saffron-700 border-saffron-100 font-semibold">🇮🇳 Mathura · Vrindavan · Agra · Delhi NCR</span>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-tight text-teal">{t('tagline')}</h1>
          <p className="mt-4 text-lg text-slate-600">{t('heroSub')}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={() => go('/onboarding?role=employer')} className="btn-primary text-lg">🏠 {t('iWantToHire')}</button>
            <button onClick={() => go('/onboarding?role=worker')} className="btn-teal text-lg">👷 {t('lookingForWork')}</button>
          </div>
          <button onClick={() => go('/login')} className="btn-ghost mt-2">✨ {t('createProfile')} · {t('tryDemo')}</button>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="relative mx-auto w-[300px] h-[420px]">
          {s.users.filter((u) => u.role === 'worker').slice(0, 3).map((u, i) => (
            <div key={u.id} className="absolute inset-0 card overflow-hidden" style={{ transform: `rotate(${(i - 1) * 6}deg) translateY(${i * 6}px)`, zIndex: 3 - i }}>
              <img src={u.photo} alt="" className="h-3/4 w-full object-cover" />
              <div className="p-4">
                <b className="text-lg">{u.name}, {u.age}</b>
                <p className="text-sm text-slate-600">{ROLES.find((r) => r.key === u.primaryRole)?.icon} {roleLabel(u.primaryRole)} · {u.area}</p>
              </div>
            </div>
          ))}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-4">
            <span className="h-14 w-14 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500"><X size={28} /></span>
            <span className="h-14 w-14 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center text-white"><Heart size={26} className="fill-white" /></span>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold text-teal text-center">{t('howItWorks')}</h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((st, i) => (
              <div key={i} className="rounded-3xl bg-cream p-5 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-saffron text-white flex items-center justify-center"><st.icon /></div>
                <div className="mt-3 text-sm font-bold text-saffron">{i + 1}</div>
                <b className="text-lg">{st.title}</b>
                <p className="text-sm text-slate-600 mt-1">{st.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-extrabold text-teal text-center">{t('agencyVs')}</h2>
          <div className="mt-8 card overflow-hidden">
            <div className="grid grid-cols-2 font-bold text-center">
              <div className="p-4 bg-slate-100 text-slate-600">{t('agency')}</div>
              <div className="p-4 bg-teal text-white">{t('us')}</div>
            </div>
            {cmp.map(([a, b], i) => (
              <div key={i} className="grid grid-cols-2 border-t">
                <div className="p-4 flex gap-2 text-slate-600"><X className="text-red-500 shrink-0" size={20} />{a}</div>
                <div className="p-4 flex gap-2 font-semibold bg-teal-50"><Check className="text-emerald-600 shrink-0" size={20} />{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold text-teal text-center">{t('trust')}</h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BadgeCheck, title: t('idVerified'), d: 'Govt. ID checked by our team (only last 4 digits stored)', c: 'text-emerald-600 bg-emerald-50' },
              { icon: ShieldCheck, title: t('policeVerified'), d: 'Police verification certificate reviewed', c: 'text-blue-600 bg-blue-50' },
              { icon: Award, title: t('recommended'), d: 'Average 4.5★ or more from 3+ employers', c: 'text-amber-600 bg-amber-50' },
              { icon: Repeat, title: t('rehired'), d: 'Hired again by the same family or shop', c: 'text-purple-600 bg-purple-50' },
            ].map((b) => (
              <div key={b.title} className="rounded-3xl border p-5 text-center">
                <div className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center ${b.c}`}><b.icon /></div>
                <b className="block mt-3">{b.title}</b>
                <p className="text-sm text-slate-600 mt-1">{b.d}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-6"><Link to="/safety" className="text-teal font-semibold underline">🛡️ {t('safetyTips')} →</Link></p>
        </div>
      </section>

      {/* LIVE STATS */}
      <section className="py-14 bg-gradient-to-br from-teal to-teal-900 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold text-center">{t('liveStats')} <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-pulse" /></h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((st) => (
              <div key={st.label} className="rounded-3xl bg-white/10 p-6 text-center">
                <st.icon className="mx-auto opacity-80" />
                <div className="text-4xl font-extrabold mt-2">{st.value.toLocaleString('en-IN')}</div>
                <div className="opacity-80">{st.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold text-teal text-center">{t('testimonials')}</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((tm) => (
              <div key={tm.name} className="card p-5">
                <div className="text-amber-400 flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} className="fill-amber-400" />)}</div>
                <p className="mt-3 text-slate-700">“{lang === 'hi' ? tm.textHi : tm.text}”</p>
                <p className="mt-3 font-bold">{tm.name} <span className="font-normal text-slate-500">· {tm.role}, {tm.city}</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-white py-14" id="pricing">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold text-teal text-center">{t('pricing')}</h2>
          <div className="mt-8 grid md:grid-cols-4 gap-4">
            <Price title="Workers" price="₹0" sub="Always free" items={['Unlimited swipes', 'Unlimited requests', 'Keep 100% salary']} highlight />
            <Price title="Households" price="₹99" sub="per connection · first one free" items={['Pay only when worker accepts', '₹249 for 5 (60 days)', 'Phone + WhatsApp unlocked']} />
            <Price title="Business Basic" price="₹499" sub="per month" items={['20 connections', '2 job posts', 'Verified badges']} />
            <Price title="Business Pro" price="₹1,499" sub="per month" items={['Unlimited connections & posts', 'Urgent boosts', 'Bulk festive hiring']} />
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">⚡ Urgent job boost: ₹49 — top of feed + highlighted pin for 48 hours. Swiping and sending requests is free for everyone.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-extrabold text-teal text-center">{t('faq')}</h2>
          <div className="mt-8 space-y-3">{faqs.map(([q, a]) => <Faq key={q} q={q} a={a} />)}</div>
        </div>
      </section>

      <footer className="bg-teal-900 text-white/80 py-10">
        <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-2xl font-extrabold"><span className="text-saffron">Kaam</span><span className="text-white">Setu</span></div>
            <p className="mt-2 text-sm">{t('tagline')}</p>
          </div>
          <div className="space-y-2 text-sm">
            <Link to="/login" className="block hover:text-white">{t('login')}</Link>
            <Link to="/safety" className="block hover:text-white">{t('safetyTips')}</Link>
            <a href="#pricing" className="block hover:text-white">{t('pricing')}</a>
          </div>
          <p className="text-sm">Made in Mathura 🙏 · © {new Date().getFullYear()} KaamSetu</p>
        </div>
      </footer>
    </div>
  );
}

function Price({ title, price, sub, items, highlight }) {
  return (
    <div className={`rounded-3xl p-6 border-2 ${highlight ? 'border-saffron bg-saffron-50' : 'border-slate-200'}`}>
      <b className="text-lg">{title}</b>
      <div className="text-4xl font-extrabold text-teal mt-2">{price}</div>
      <div className="text-sm text-slate-500">{sub}</div>
      <ul className="mt-4 space-y-2 text-sm">{items.map((i) => <li key={i} className="flex gap-2"><Check size={18} className="text-emerald-600 shrink-0" />{i}</li>)}</ul>
    </div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} className="w-full card p-5 text-left">
      <div className="flex justify-between items-center gap-3 font-bold text-lg">{q}<ChevronDown className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} /></div>
      {open && <p className="mt-2 text-slate-600">{a}</p>}
    </button>
  );
}
