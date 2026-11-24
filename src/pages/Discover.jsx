import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocateFixed, List, Map as MapIcon, MapPin, Heart, Check } from 'lucide-react';
import { useApp, rupee } from '../lib/useApp';
import { feedFor, locOf, prefsOf, setPrefs, swipe, updateUser, ratingOf } from '../lib/store';
import { offsetPoint, fmtKm, getGps } from '../lib/geo';
import { ROLES, roleOf } from '../i18n';
import { Sheet, Avatar, Stars, Badges, Empty, Toast } from '../components/ui';
import ProfileCard from '../components/ProfileCard';
import { badgesOf } from '../lib/store';

const pinIcon = (emoji, highlight) => L.divIcon({
  className: 'emoji-pin',
  html: `<div style="width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${highlight ? '#dc2626' : '#0F5257'};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.3);border:3px solid white"><span style="transform:rotate(45deg);font-size:20px">${emoji}</span></div>`,
  iconSize: [44, 44], iconAnchor: [22, 44],
});
const meIcon = L.divIcon({ className: 'emoji-pin', html: '<div style="width:22px;height:22px;border-radius:50%;background:#E8772E;border:4px solid white;box-shadow:0 0 0 6px rgba(232,119,46,.3)"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

function Recenter({ center, trigger }) {
  const map = useMap();
  useEffect(() => { if (trigger) map.flyTo([center.lat, center.lng], 13); }, [trigger]); // eslint-disable-line
  return null;
}

export default function Discover() {
  const { s, user, t, roleLabel } = useApp();
  const prefs = prefsOf(s, user);
  const here = locOf(user);
  const [roleFilter, setRoleFilter] = useState('');
  const [availNow, setAvailNow] = useState(false);
  const [list, setList] = useState(false);
  const [sel, setSel] = useState(null);
  const [full, setFull] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const [toast, setToast] = useState('');
  const isWorker = user.role === 'worker';

  const items = useMemo(() => feedFor(s, user, { ignoreSwipes: true })
    .filter((c) => !roleFilter || (c.kind === 'job' ? c.job.role : c.user.primaryRole) === roleFilter)
    .filter((c) => !availNow || c.kind === 'job' || c.user.available), [s, user, roleFilter, availNow]);

  const locate = async () => {
    try { const p = await getGps(); updateUser(user.id, p); setToast('📍 Location updated'); }
    catch { setToast('GPS not available — using your saved area'); }
    setRecenter((n) => n + 1);
  };

  const connect = (c) => {
    const id = swipe(user, c, 'right') ?? null;
    setToast(id ? '💚 Request sent' : 'Already connected');
    setSel(null); setFull(false);
  };
  const requested = (c) => s.requests.some((r) => r.fromId === user.id && r.toId === c.user.id && ['pending', 'accepted', 'hired'].includes(r.status));

  const roleKeyOf = (c) => (c.kind === 'job' ? c.job.role : c.user.primaryRole);

  return (
    <div className="relative h-full">
      <Toast message={toast} onDone={() => setToast('')} />
      {/* filter chips */}
      <div className="absolute top-2 inset-x-0 z-[450] px-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setRoleFilter('')} className={`${!roleFilter ? 'chip-on' : 'chip-off'} shrink-0 shadow`}>{t('allRoles')}</button>
          {ROLES.map((r) => (
            <button key={r.key} onClick={() => setRoleFilter(roleFilter === r.key ? '' : r.key)} className={`${roleFilter === r.key ? 'chip-on' : 'chip-off'} shrink-0 shadow`}>{r.icon} {roleLabel(r.key)}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {!isWorker && <button onClick={() => setAvailNow(!availNow)} className={`${availNow ? 'chip-on' : 'chip-off'} shadow`}>🟢 {t('availableNow')}</button>}
          {!isWorker && <button onClick={() => setPrefs(user.id, { verifiedOnly: !prefs.verifiedOnly })} className={`${prefs.verifiedOnly ? 'chip-on' : 'chip-off'} shadow`}>✅ {t('verifiedOnly')}</button>}
          <button onClick={() => setList(!list)} className="chip-off shadow ml-auto">{list ? <><MapIcon size={16} />{t('mapView')}</> : <><List size={16} />{t('listView')}</>}</button>
        </div>
      </div>

      {list ? (
        <div className="h-full overflow-y-auto pt-28 px-3 pb-4 space-y-2">
          {items.length === 0 && <Empty icon="🗺️" title={t('emptyFeed')} />}
          {[...items].sort((a, b) => a.distance - b.distance).map((c) => (
            <button key={c.id} onClick={() => setSel(c)} className="card w-full p-3 flex items-center gap-3 text-left">
              <Avatar src={c.user.photo} name={c.user.name} size={56} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{c.kind === 'job' ? c.user.businessName : c.user.name}</div>
                <div className="text-sm text-slate-600">{roleOf(roleKeyOf(c)).icon} {roleLabel(roleKeyOf(c))}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} />{fmtKm(c.distance)}</div>
              </div>
              <span className="font-bold text-teal">{rupee(c.kind === 'job' ? c.job.pay : c.user.wage)}</span>
            </button>
          ))}
        </div>
      ) : (
        <MapContainer center={[here.lat, here.lng]} zoom={13} className="h-full w-full z-0" zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter center={here} trigger={recenter} />
          <Circle center={[here.lat, here.lng]} radius={prefs.maxDistance * 1000} pathOptions={{ color: '#E8772E', fillOpacity: 0.06, weight: 2 }} />
          <Marker position={[here.lat, here.lng]} icon={meIcon} />
          {items.map((c) => {
            const p = offsetPoint(c.id, c.kind === 'job' ? c.job : c.user);
            return <Marker key={c.id} position={[p.lat, p.lng]} icon={pinIcon(roleOf(roleKeyOf(c)).icon, c.urgent)} eventHandlers={{ click: () => setSel(c) }} />;
          })}
        </MapContainer>
      )}

      {!list && (
        <>
          <button onClick={locate} className="absolute bottom-4 right-4 z-[450] h-14 w-14 rounded-full bg-white shadow-lg flex items-center justify-center text-saffron" aria-label={t('myLocation')}><LocateFixed size={26} /></button>
          <div className="absolute bottom-4 left-4 z-[450] chip bg-white shadow border-slate-200 font-semibold">{t('matchesNear', { n: items.length })}</div>
        </>
      )}

      <Sheet open={!!sel && !full} onClose={() => setSel(null)}>
        {sel && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <Avatar src={sel.user.photo} name={sel.user.name} size={80} />
              <div className="min-w-0">
                <h3 className="text-xl font-extrabold">{sel.kind === 'job' ? sel.user.businessName : sel.user.name}</h3>
                <p className="font-semibold text-slate-700">{roleOf(roleKeyOf(sel)).icon} {roleLabel(roleKeyOf(sel))}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} />{fmtKm(sel.distance)} {t('away')}</p>
                {sel.kind === 'worker' && <Stars value={ratingOf(s, sel.user.id).avg} count={ratingOf(s, sel.user.id).count} />}
              </div>
            </div>
            <Badges list={badgesOf(s, sel.user)} small />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFull(true)} className="btn-outline">{t('viewFull')}</button>
              {requested(sel) ? (
                <button disabled className="btn-teal"><Check size={18} />{t('pending')}</button>
              ) : (
                <button onClick={() => connect(sel)} className="btn-primary !bg-emerald-500"><Heart size={18} className="fill-white" />{t('connect')}</button>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {full && sel && (
        <div className="absolute inset-0 z-[900] bg-cream p-2 flex flex-col">
          <div className="flex-1 min-h-0"><ProfileCard card={sel} /></div>
          <div className="grid grid-cols-2 gap-3 p-2">
            <button onClick={() => setFull(false)} className="btn-outline">{t('back')}</button>
            {requested(sel) ? <button disabled className="btn-teal">{t('pending')}</button>
              : <button onClick={() => connect(sel)} className="btn-primary !bg-emerald-500"><Heart size={18} className="fill-white" />{t('connect')}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
