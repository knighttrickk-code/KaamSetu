import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { LangToggle } from '../components/AppShell';

const TIPS = {
  en: {
    employers: ['Check ID Verified and Police Verified badges before hiring.', 'Read reviews from past employers.', 'Meet first in a public place or with a family member present.', 'Do a short paid trial day before a permanent hire.', 'Keep a copy of the worker’s ID (last 4 digits are shown on KaamSetu).', 'Pay salary on time and in writing (UPI is best).'],
    workers: ['Never pay anyone money to get a job — KaamSetu is always free for workers.', 'Tell a family member the address and timings before your first visit.', 'Go for the first meeting in daylight.', 'Agree on salary, timings and weekly off in chat before starting.', 'If anyone behaves badly, use “Report profile” — we act fast.', 'Do not share your full Aadhaar number or OTPs with anyone.'],
  },
  hi: {
    employers: ['काम पर रखने से पहले पहचान और पुलिस सत्यापन बैज देखें।', 'पिछले नियोक्ताओं के रिव्यू पढ़ें।', 'पहली बार किसी सार्वजनिक जगह या परिवार के सदस्य के साथ मिलें।', 'स्थायी रखने से पहले एक दिन का ट्रायल करें।', 'कामगार के पहचान पत्र की कॉपी रखें।', 'वेतन समय पर और लिखित में दें (UPI सबसे अच्छा)।'],
    workers: ['नौकरी के लिए कभी किसी को पैसे न दें — कामसेतु कामगारों के लिए मुफ़्त है।', 'पहली बार जाने से पहले परिवार को पता और समय बताएं।', 'पहली मुलाक़ात दिन में करें।', 'शुरू करने से पहले चैट में वेतन, समय और छुट्टी तय करें।', 'कोई बुरा व्यवहार करे तो “प्रोफ़ाइल रिपोर्ट करें” दबाएं।', 'अपना पूरा आधार नंबर या OTP किसी को न बताएं।'],
  },
};

export default function Safety() {
  const { lang, t } = useApp();
  const tips = TIPS[lang] || TIPS.en;
  return (
    <div className="min-h-full bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="p-2 -ml-2"><ArrowLeft /></Link>
          <LangToggle />
        </div>
        <h1 className="text-4xl font-extrabold text-teal mt-4">🛡️ {t('safetyTips')}</h1>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-saffron">🏠 {lang === 'hi' ? 'नियोक्ताओं के लिए' : 'For employers'}</h2>
            <ul className="mt-3 space-y-3">{tips.employers.map((x) => <li key={x} className="flex gap-2">✅ <span>{x}</span></li>)}</ul>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-bold text-saffron">👷 {lang === 'hi' ? 'कामगारों के लिए' : 'For workers'}</h2>
            <ul className="mt-3 space-y-3">{tips.workers.map((x) => <li key={x} className="flex gap-2">✅ <span>{x}</span></li>)}</ul>
          </div>
        </div>
        <div className="card p-6 mt-4 bg-red-50">
          <b>🚨 {lang === 'hi' ? 'आपात स्थिति में' : 'In an emergency'}:</b> {lang === 'hi' ? 'पुलिस 112 · महिला हेल्पलाइन 181' : 'Police 112 · Women helpline 181'}
        </div>
      </div>
    </div>
  );
}
