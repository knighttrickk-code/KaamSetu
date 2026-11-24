import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { X, Star, Heart, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/useApp';
import { feedFor, swipe, undoSwipe, toggleSave, clearPasses } from '../lib/store';
import ProfileCard from '../components/ProfileCard';
import { Empty, SkeletonCard, Toast } from '../components/ui';

const SwipeCard = forwardRef(function SwipeCard({ card, onDecide }, ref) {
  const { t } = useApp();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-16, 16]);
  const passOpacity = useTransform(x, [-140, -20], [1, 0]);
  const connectOpacity = useTransform(x, [20, 140], [0, 1]);
  const controls = useAnimation();
  const busy = useRef(false);

  const fly = async (dir) => {
    if (busy.current) return;
    busy.current = true;
    await controls.start({ x: dir === 'right' ? 520 : -520, rotate: dir === 'right' ? 24 : -24, opacity: 0, transition: { duration: 0.32 } });
    onDecide(dir);
  };
  useImperativeHandle(ref, () => ({ fly }));

  const stamp = (
    <>
      <motion.div style={{ opacity: passOpacity }} className="absolute top-8 right-6 z-10 rotate-12 rounded-xl border-4 border-red-500 px-4 py-1 text-4xl font-black text-red-500 bg-white/70">{t('pass')}</motion.div>
      <motion.div style={{ opacity: connectOpacity }} className="absolute top-8 left-6 z-10 -rotate-12 rounded-xl border-4 border-emerald-500 px-4 py-1 text-4xl font-black text-emerald-500 bg-white/70">{t('connect')}</motion.div>
    </>
  );

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, touchAction: 'pan-y' }}
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      animate={controls}
      onDragEnd={(_, info) => {
        if (info.offset.x > 110 || info.velocity.x > 700) fly('right');
        else if (info.offset.x < -110 || info.velocity.x < -700) fly('left');
      }}
    >
      <ProfileCard card={card} stamp={stamp} />
    </motion.div>
  );
});

export default function People() {
  const { s, user, t } = useApp();
  const feed = useMemo(() => feedFor(s, user), [s, user]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const top = feed[0];
  const next = feed[1];
  const cardRef = useRef(null);
  const isSaved = top && s.saved.some((x) => x.userId === user.id && x.targetId === top.id);

  useEffect(() => { const id = setTimeout(() => setLoading(false), 450); return () => clearTimeout(id); }, []);

  const decide = (dir) => {
    const reqId = swipe(user, top, dir);
    if (dir === 'right') setToast(reqId ? `💚 Request sent to ${top.kind === 'job' ? top.user.businessName : top.user.name}` : 'Already connected');
  };

  if (loading) return <div className="p-4"><SkeletonCard /></div>;

  return (
    <div className="h-full flex flex-col">
      <Toast message={toast} onDone={() => setToast('')} />
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="chip bg-teal-50 text-teal border-teal-100 font-semibold">📍 {t('matchesNear', { n: feed.length })}</span>
        <Link to="/app/job-profile" className="chip-off"><SlidersHorizontal size={16} />{t('jobProfile')}</Link>
      </div>

      {!top ? (
        <Empty icon="🏘️" title={t('emptyFeed')}>
          <Link to="/app/job-profile" className="btn-primary">{t('openJobProfile')}</Link>
          <button onClick={() => clearPasses(user.id)} className="btn-ghost">{t('resetPasses')}</button>
          <button onClick={() => undoSwipe(user.id)} className="btn-ghost"><RotateCcw size={18} />{t('undo')}</button>
        </Empty>
      ) : (
        <>
          <div className="relative flex-1 mx-3 mb-2">
            {next && (
              <div className="absolute inset-0 scale-[0.95] translate-y-3 opacity-70 pointer-events-none">
                <ProfileCard card={next} />
              </div>
            )}
            <SwipeCard key={top.id} ref={cardRef} card={top} onDecide={decide} />
          </div>
          <div className="relative z-10 flex items-center justify-center gap-4 pb-3 -mt-20">
            <RoundBtn label={t('undo')} onClick={() => undoSwipe(user.id)} className="h-12 w-12 text-amber-500"><RotateCcw size={22} /></RoundBtn>
            <RoundBtn label={t('pass')} onClick={() => cardRef.current?.fly('left')} className="h-16 w-16 text-red-500"><X size={32} strokeWidth={3} /></RoundBtn>
            <RoundBtn label={t('save')} onClick={() => { toggleSave(user.id, top.id); setToast(isSaved ? 'Removed from saved' : '⭐ Saved'); }} className={`h-12 w-12 ${isSaved ? 'text-white !bg-blue-500' : 'text-blue-500'}`}><Star size={22} className={isSaved ? 'fill-white' : ''} /></RoundBtn>
            <RoundBtn label={t('connect')} onClick={() => cardRef.current?.fly('right')} className="h-16 w-16 text-white !bg-emerald-500"><Heart size={30} className="fill-white" /></RoundBtn>
          </div>
        </>
      )}
    </div>
  );
}

function RoundBtn({ children, onClick, className, label }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`rounded-full bg-white shadow-lg flex items-center justify-center active:scale-90 transition ${className}`}>
      {children}
    </button>
  );
}
