import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as MapTip } from 'react-leaflet';
import { LayoutDashboard, ShieldCheck, Flag, Users, Briefcase, Star, Download, LogOut, Check, X } from 'lucide-react';
import { useApp, rupee, timeAgo } from '../lib/useApp';
import { login, logout, userById, reviewVerification, resolveReport, updateUser, updateJob, deleteReview, ratingOf } from '../lib/store';
import { ROLES, roleOf } from '../i18n';
import { Logo } from '../components/AppShell';
import { Avatar } from '../components/ui';

function downloadCsv(name, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name; a.click();
}

const TABS = [
  { k: 'overview', label: 'Overview', icon: LayoutDashboard },
  { k: 'verify', label: 'Verification queue', icon: ShieldCheck },
  { k: 'reports', label: 'Reported profiles', icon: Flag },
  { k: 'users', label: 'Users', icon: Users },
  { k: 'jobs', label: 'Jobs', icon: Briefcase },
  { k: 'reviews', label: 'Reviews', icon: Star },
];

export default function Admin() {
  const { s, user } = useApp();
  const nav = useNavigate();
  const [tab, setTab] = useState('overview');

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-teal">Admin only</h1>
        <p className="text-slate-600">Admin role is set manually in the database. For the demo:</p>
        <button className="btn-primary" onClick={() => login('admin')}>Login as demo admin</button>
      </div>
    );
  }

  const pendingV = s.verifications.filter((v) => v.status === 'pending').length;
  const openR = s.reports.filter((r) => r.status === 'open').length;

  return (
    <div className="min-h-full flex bg-slate-50">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r p-4 gap-1 sticky top-0 h-screen">
        <div className="mb-6"><Logo small /></div>
        {TABS.map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold ${tab === k ? 'bg-saffron-50 text-saffron' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Icon size={18} />{label}
            {k === 'verify' && pendingV > 0 && <span className="ml-auto chip bg-saffron text-white border-0 text-xs !py-0">{pendingV}</span>}
            {k === 'reports' && openR > 0 && <span className="ml-auto chip bg-red-500 text-white border-0 text-xs !py-0">{openR}</span>}
          </button>
        ))}
        <button onClick={() => { logout(); nav('/'); }} className="mt-auto flex items-center gap-3 px-3 py-3 text-red-600 font-semibold"><LogOut size={18} />Logout</button>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">
        <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {TABS.map(({ k, label }) => <button key={k} onClick={() => setTab(k)} className={`${tab === k ? 'chip-on' : 'chip-off'} shrink-0`}>{label}</button>)}
        </div>
        {tab === 'overview' && <Overview />}
        {tab === 'verify' && <VerifyQueue />}
        {tab === 'reports' && <Reports />}
        {tab === 'users' && <UsersTable />}
        {tab === 'jobs' && <JobsTable />}
        {tab === 'reviews' && <ReviewsTable />}
      </main>
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return <div className="bg-white rounded-2xl p-5 shadow-sm"><div className="text-sm text-slate-500">{label}</div><div className="text-3xl font-extrabold text-teal mt-1">{value}</div>{sub && <div className="text-xs text-emerald-600 mt-1">{sub}</div>}</div>;
}
function Panel({ title, children, action }) {
  return <div className="bg-white rounded-2xl p-5 shadow-sm"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-teal">{title}</h3>{action}</div>{children}</div>;
}

function Overview() {
  const { s, roleLabel } = useApp();
  const live = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      signups: s.users.filter((u) => u.createdAt > weekAgo).length,
      swipes: s.swipes.filter((w) => w.at > weekAgo).length,
      requests: s.requests.filter((r) => r.createdAt > weekAgo).length,
      accepted: s.requests.filter((r) => r.createdAt > weekAgo && ['accepted', 'hired'].includes(r.status)).length,
      revenue: s.transactions.filter((x) => x.at > weekAgo).reduce((a, x) => a + (x.amount || 0), 0),
    };
  }, [s]);
  const data = s.activity.map((w, i, arr) => {
    const row = i === arr.length - 1 ? { ...w, signups: w.signups + live.signups, swipes: w.swipes + live.swipes, requests: w.requests + live.requests, accepted: w.accepted + live.accepted, revenue: w.revenue + live.revenue } : w;
    return { ...row, rate: Math.round((row.accepted / row.requests) * 100) };
  });
  const last = data[data.length - 1];
  const demand = ROLES.map((r) => ({
    role: roleLabel(r.key).split(' /')[0],
    demand: s.jobs.filter((j) => j.role === r.key && j.open).length * 3 + Object.values(s.prefs).filter((p) => p.role === r.key).length * 2 + s.requests.filter((q) => userById(s, q.toId)?.primaryRole === r.key || userById(s, q.fromId)?.primaryRole === r.key).length,
  })).sort((a, b) => b.demand - a.demand);
  const areas = useMemo(() => {
    const m = {};
    s.users.filter((u) => u.lat && u.role !== 'admin').forEach((u) => {
      const k = `${u.area || ''}, ${u.city || ''}`;
      m[k] = m[k] || { name: k, lat: u.lat, lng: u.lng, n: 0 };
      m[k].n += 1 + s.swipes.filter((w) => w.userId === u.id).length + s.requests.filter((r) => r.fromId === u.id || r.toId === u.id).length;
    });
    return Object.values(m);
  }, [s]);
  const maxN = Math.max(...areas.map((a) => a.n), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-teal">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Sign-ups (this week)" value={last.signups} sub="▲ vs last week" />
        <Kpi label="Swipes (this week)" value={last.swipes.toLocaleString('en-IN')} />
        <Kpi label="Acceptance rate" value={`${last.rate}%`} />
        <Kpi label="Revenue (mock)" value={rupee(last.revenue)} />
        <Kpi label="Total users" value={s.users.length} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Weekly sign-ups"><ResponsiveContainer width="100%" height={240}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" /><YAxis /><Tooltip /><Bar dataKey="signups" fill="#E8772E" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Panel>
        <Panel title="Weekly swipes"><ResponsiveContainer width="100%" height={240}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" /><YAxis /><Tooltip /><Line dataKey="swipes" stroke="#0F5257" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></Panel>
        <Panel title="Acceptance rate (%)"><ResponsiveContainer width="100%" height={240}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" /><YAxis domain={[0, 100]} /><Tooltip /><Line dataKey="rate" stroke="#10b981" strokeWidth={3} /></LineChart></ResponsiveContainer></Panel>
        <Panel title="Revenue (mock, ₹)"><ResponsiveContainer width="100%" height={240}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" /><YAxis /><Tooltip formatter={(v) => rupee(v)} /><Bar dataKey="revenue" fill="#0F5257" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Panel>
        <Panel title="Top skills in demand"><ResponsiveContainer width="100%" height={280}><BarChart data={demand} layout="vertical" margin={{ left: 40 }}><XAxis type="number" hide /><YAxis type="category" dataKey="role" width={110} /><Tooltip /><Bar dataKey="demand" fill="#E8772E" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Panel>
        <Panel title="Activity heat-map by neighbourhood">
          <div className="h-[280px] rounded-xl overflow-hidden">
            <MapContainer center={[27.5, 77.68]} zoom={12} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              {areas.map((a) => (
                <CircleMarker key={a.name} center={[a.lat, a.lng]} radius={8 + (a.n / maxN) * 22} pathOptions={{ color: '#E8772E', fillColor: '#E8772E', fillOpacity: 0.25 + (a.n / maxN) * 0.5, weight: 1 }}>
                  <MapTip>{a.name}: {a.n} activity</MapTip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function VerifyQueue() {
  const { s } = useApp();
  const [reason, setReason] = useState({});
  const list = s.verifications.filter((v) => v.status === 'pending');
  const done = s.verifications.filter((v) => v.status !== 'pending').slice(0, 10);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-teal">Verification queue</h1>
      {list.length === 0 && <p className="text-slate-500">🎉 Queue is empty.</p>}
      {list.map((v) => {
        const u = userById(s, v.userId);
        return (
          <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 md:items-center">
            <Avatar src={u?.photo} name={u?.name} size={56} />
            <div className="flex-1">
              <b>{u?.name}</b> <span className="text-slate-500">· {roleOf(u?.primaryRole).en || u?.role}</span>
              <div className="text-sm">{v.kind === 'id' ? `🪪 ${v.idType} ending •••• ${v.last4}` : '🛡️ Police verification certificate'} · {timeAgo(v.at)}</div>
              {v.image && v.image !== 'pdf' && <img src={v.image} alt="document" className="mt-2 h-24 rounded-lg border" />}
              {v.image === 'pdf' && <div className="text-xs mt-1">📄 PDF uploaded</div>}
              <p className="text-xs text-slate-400 mt-1">Private admin-only storage. Image is deleted after review.</p>
            </div>
            <input className="input md:w-56" placeholder="Reason (if rejecting)" value={reason[v.id] || ''} onChange={(e) => setReason({ ...reason, [v.id]: e.target.value })} />
            <div className="flex gap-2">
              <button className="btn !bg-emerald-500 text-white" onClick={() => reviewVerification(v.id, true)}><Check size={18} />Approve</button>
              <button className="btn !bg-red-50 text-red-600" onClick={() => reviewVerification(v.id, false, reason[v.id] || 'Document unclear')}><X size={18} />Reject</button>
            </div>
          </div>
        );
      })}
      {done.length > 0 && <Panel title="Recently reviewed">{done.map((v) => <div key={v.id} className="text-sm py-1">{userById(s, v.userId)?.name} · {v.kind} · <b>{v.status}</b> {v.reason && `(${v.reason})`}</div>)}</Panel>}
    </div>
  );
}

function Reports() {
  const { s } = useApp();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-teal">Reported profiles</h1>
      {s.reports.length === 0 && <p className="text-slate-500">No reports.</p>}
      {s.reports.map((r) => {
        const u = userById(s, r.targetId); const by = userById(s, r.reporterId);
        return (
          <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 md:items-center">
            <Avatar src={u?.photo} name={u?.name} size={56} />
            <div className="flex-1">
              <b>{u?.name}</b> {u?.suspended && <span className="chip bg-red-100 text-red-700 border-0 text-xs">Suspended</span>}
              <div className="text-sm">“{r.reason}” — reported by {by?.name || 'user'} · {timeAgo(r.at)}</div>
              <div className="text-xs font-semibold mt-1">Status: {r.status}</div>
            </div>
            {r.status === 'open' && (
              <div className="flex gap-2">
                <button className="btn-outline !min-h-[40px] !py-2" onClick={() => resolveReport(r.id, 'warned')}>Warn</button>
                <button className="btn !bg-red-600 text-white !min-h-[40px] !py-2" onClick={() => resolveReport(r.id, 'suspended')}>Suspend</button>
                <button className="btn-ghost !min-h-[40px] !py-2" onClick={() => resolveReport(r.id, 'dismissed')}>Dismiss</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UsersTable() {
  const { s } = useApp();
  const [q, setQ] = useState('');
  const rows = s.users.filter((u) => u.role !== 'admin' && (u.name + (u.businessName || '') + (u.city || '')).toLowerCase().includes(q.toLowerCase()));
  const csv = () => downloadCsv('kaamsetu-users.csv', rows.map((u) => ({ id: u.id, name: u.name, role: u.role, work: u.primaryRole || u.businessType, city: u.city, area: u.area, id_status: u.idStatus, police_status: u.policeStatus, rating: ratingOf(s, u.id).avg || '', suspended: !!u.suspended, joined: new Date(u.createdAt).toISOString().slice(0, 10) })));
  return (
    <Panel title={`Users (${rows.length})`} action={<button className="btn-outline !min-h-[40px] !py-2" onClick={csv}><Download size={16} />CSV</button>}>
      <input className="input mb-4" placeholder="Search name / city" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Name</th><th>Role</th><th>City</th><th>ID</th><th>Police</th><th>Rating</th><th></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 flex items-center gap-2"><Avatar src={u.photo} name={u.name} size={32} /><span>{u.name}{u.businessName && u.role !== 'worker' ? ` · ${u.businessName}` : ''}</span></td>
                <td>{u.role === 'worker' ? `${roleOf(u.primaryRole).icon} ${roleOf(u.primaryRole).en}` : u.role}</td>
                <td>{u.city}</td><td>{u.idStatus}</td><td>{u.policeStatus}</td>
                <td>{u.role === 'worker' ? ratingOf(s, u.id).avg : '—'}</td>
                <td><button className={`chip text-xs ${u.suspended ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} onClick={() => updateUser(u.id, { suspended: !u.suspended })}>{u.suspended ? 'Unsuspend' : 'Suspend'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function JobsTable() {
  const { s } = useApp();
  const csv = () => downloadCsv('kaamsetu-jobs.csv', s.jobs.map((j) => ({ id: j.id, employer: userById(s, j.employerId)?.businessName, role: j.role, pay: j.pay, pay_type: j.payType, timings: j.timings, open: j.open, urgent: j.urgentUntil > Date.now() })));
  return (
    <Panel title={`Jobs (${s.jobs.length})`} action={<button className="btn-outline !min-h-[40px] !py-2" onClick={csv}><Download size={16} />CSV</button>}>
      <div className="space-y-2">
        {s.jobs.map((j) => (
          <div key={j.id} className="flex items-center gap-3 border-b last:border-0 py-2 text-sm">
            <span className="text-2xl">{roleOf(j.role).icon}</span>
            <div className="flex-1"><b>{roleOf(j.role).en}</b> · {userById(s, j.employerId)?.businessName} · {rupee(j.pay)}/{j.payType} · {j.timings} {j.urgentUntil > Date.now() && <span className="text-red-600 font-bold">URGENT</span>}</div>
            <button className="chip-off text-xs" onClick={() => updateJob(j.id, { open: !j.open })}>{j.open ? 'Close' : 'Reopen'}</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ReviewsTable() {
  const { s } = useApp();
  const csv = () => downloadCsv('kaamsetu-reviews.csv', s.reviews.map((r) => ({ id: r.id, worker: userById(s, r.workerId)?.name, by: r.reviewerName, stars: r.stars, tags: (r.tags || []).join('|'), text: r.text })));
  return (
    <Panel title={`Reviews (${s.reviews.length})`} action={<button className="btn-outline !min-h-[40px] !py-2" onClick={csv}><Download size={16} />CSV</button>}>
      <div className="space-y-2">
        {s.reviews.slice(0, 80).map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b last:border-0 py-2 text-sm">
            <span className="text-amber-500 w-20">{'★'.repeat(r.stars)}</span>
            <div className="flex-1"><b>{userById(s, r.workerId)?.name}</b> ← {r.reviewerName}: {r.text}</div>
            <button className="chip text-xs bg-red-50 text-red-700" onClick={() => deleteReview(r.id)}>Remove</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
