import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './lib/useApp';
import AppShell from './components/AppShell';
import Landing from './pages/Landing';
import Safety from './pages/Safety';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import People from './pages/People';
import Discover from './pages/Discover';
import JobProfile from './pages/JobProfile';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  const { lang } = useApp();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/admin" element={<Suspense fallback={<div className="p-8 text-center">Loading…</div>}><Admin /></Suspense>} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="people" replace />} />
        <Route path="people" element={<People />} />
        <Route path="discover" element={<Discover />} />
        <Route path="job-profile" element={<JobProfile />} />
        <Route path="profile" element={<Profile />} />
        <Route path="requests" element={<Requests />} />
        <Route path="chat/:id" element={<Chat />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
