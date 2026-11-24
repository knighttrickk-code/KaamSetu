import { useState } from 'react';
import { CreditCard, CheckCircle2, Smartphone } from 'lucide-react';
import { Modal } from './ui';
import { useApp, rupee } from '../lib/useApp';
import { PACKS, processPayment, applyPurchase } from '../lib/store';

/**
 * Mock checkout. `items` overrides the default packs (e.g. a ₹49 boost).
 * onPaid(pack) is called after a successful payment.
 */
export default function PaymentModal({ open, onClose, onPaid, items, title }) {
  const { t, user, lang } = useApp();
  const packs = items || PACKS[user?.role === 'business' ? 'business' : 'household'];
  const [sel, setSel] = useState(null);
  const [state, setState] = useState('idle');
  const chosen = sel || packs[packs.length - 1];

  const pay = async () => {
    setState('paying');
    const res = await processPayment({ amount: chosen.price, description: chosen.title });
    if (res.ok) {
      if (!chosen.custom) applyPurchase(user.id, chosen);
      setState('done');
      setTimeout(() => { onPaid?.(chosen); setState('idle'); onClose(); }, 1000);
    } else setState('idle');
  };

  return (
    <Modal open={open} onClose={() => state !== 'paying' && onClose()} title={title || t('payment')}>
      {state === 'done' ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle2 size={64} className="text-emerald-500" />
          <p className="text-lg font-bold">{t('paySuccess')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packs.map((p) => (
            <button key={p.id} onClick={() => setSel(p)} className={`w-full text-left rounded-2xl border-2 p-4 transition ${chosen.id === p.id ? 'border-saffron bg-saffron-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{lang === 'hi' && p.titleHi ? p.titleHi : p.title}</span>
                <span className="font-extrabold text-teal text-xl">{rupee(p.price)}</span>
              </div>
              {p.note && <p className="text-sm text-slate-600 mt-1">{p.note}</p>}
            </button>
          ))}
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            <Smartphone size={18} /> UPI · <CreditCard size={18} /> Card · Netbanking
          </div>
          <button className="btn-primary w-full text-lg" onClick={pay} disabled={state === 'paying'}>
            {state === 'paying' ? t('paying') : `${t('payNow')} ${rupee(chosen.price)}`}
          </button>
          <p className="text-xs text-center text-slate-500">{t('demoPay')}</p>
        </div>
      )}
    </Modal>
  );
}
