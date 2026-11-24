import { NavLink, Link, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Users, Map, SlidersHorizontal, UserCircle, Bell, MessageCircle } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { setLang, expireOldRequests } from '../lib/store';

export function PhoneFrame({ children }) {
  return (
    <div className="min-h-full w-full md:flex md:items-center md:justify-center md:bg-gradient-to-br md:from-teal-50 md:to-saffron-50 md:py-6">
      <div id="frame-root" className="relative mx-auto h-[100dvh] w-full overflow-hidden bg-cream md:h-[860px] md:max-h-[calc(100vh-48px)] md:w-[400px] md:rounded-[40px] md:border-[10px] md:border-slate-900 md:shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function LangToggle() {
  const { lang } = useApp();
  return (
    <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="rounded-full border-2 border-teal-100 px-3 py-1.5 text-sm font-bold text-teal" aria-label="language">
      {lang === 'en' ? 'हिंदी' : 'EN'}
    </button>
  );
}

export function Logo({ small }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className={small ? 'h-8 w-8' : 'h-10 w-10'} />
      <span className={`${small ? 'text-xl' : 'text-2xl'} font-extrabold tracking-tight`}><span className="text-saffron">Kaam</span><span className="text-teal">Setu</span></span>
    </Link>
  );
}

function Header() {
  const { s, user } = useApp();
  const unreadNotif = s.notifications.filter((n) => n.userId === user.id && !n.read).length;
  const myReqIds = s.requests.filter((r) => r.fromId === user.id || r.toId === user.id).map((r) => r.id);
  const unreadMsgs = s.messages.filter((m) => myReqIds.includes(m.reqId) && m.fromId !== user.id && !m.read).length;
  const pendingReceived = s.requests.filter((r) => r.toId === user.id && r.status === 'pending').length;
  const chatBadge = unreadMsgs + pendingReceived;
  return (
    <header className="absolute top-0 inset-x-0 z-[500] h-16 flex items-center justify-between px-4 bg-cream/95 backdrop-blur border-b border-slate-100">
      <Logo small />
      <div className="flex items-center gap-1">
        <LangToggle />
        <Link to="/app/notifications" className="relative p-2.5 rounded-full hover:bg-white" aria-label="notifications">
          <Bell size={24} className="text-teal" />
          {unreadNotif > 0 && <span className="absolute top-1 right-1 min-w-[20px] h-5 px-1 rounded-full bg-saffron text-white text-xs font-bold flex items-center justify-center">{unreadNotif}</span>}
        </Link>
        <Link to="/app/requests" className="relative p-2.5 rounded-full hover:bg-white" aria-label="chats">
          <MessageCircle size={24} className="text-teal" />
          {chatBadge > 0 && <span className="absolute top-1 right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{chatBadge}</span>}
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const { t } = useApp();
  const tabs = [
    { to: '/app/people', icon: Users, label: t('people') },
    { to: '/app/discover', icon: Map, label: t('discover') },
    { to: '/app/job-profile', icon: SlidersHorizontal, label: t('jobProfile') },
    { to: '/app/profile', icon: UserCircle, label: t('profile') },
  ];
  return (
    <nav className="absolute bottom-0 inset-x-0 z-[500] h-[72px] bg-white border-t border-slate-200 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? 'text-saffron' : 'text-slate-500'}`}>
          {({ isActive }) => (<><span className={`rounded-full px-4 py-1 ${isActive ? 'bg-saffron-50' : ''}`}><Icon size={24} /></span>{label}</>)}
        </NavLink>
      ))}
    </nav>
  );
}

/** Logged-in app layout. Redirects to login / onboarding when needed. */
export default function AppShell() {
  const { user } = useApp();
  const loc = useLocation();
  useEffect(() => { expireOldRequests(); }, [loc.pathname]);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  const isChat = loc.pathname.startsWith('/app/chat/');
  return (
    <PhoneFrame>
      {!isChat && <Header />}
      <main className={`absolute inset-x-0 ${isChat ? 'top-0 bottom-0' : 'top-16 bottom-[72px]'} overflow-y-auto`}>
        <Outlet />
      </main>
      {!isChat && <BottomNav />}
    </PhoneFrame>
  );
}
