import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp, timeAgo } from '../lib/useApp';
import { markNotificationsRead } from '../lib/store';
import { Empty } from '../components/ui';

const ICON = { request: '🤝', accepted: '✅', declined: '🙏', message: '💬', payment: '💳', hired: '🎉', review: '⭐', verify: '🛡️', warn: '⚠️', match: '📍' };

export default function Notifications() {
  const { s, user, t, lang } = useApp();
  const list = s.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.at - a.at);
  useEffect(() => () => markNotificationsRead(user.id), [user.id]);
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-2xl font-extrabold text-teal mb-2">{t('notifications')}</h1>
      {list.length === 0 && <Empty icon="🔔" title={t('noNotifications')} />}
      {list.map((n) => (
        <Link key={n.id} to={n.link || '#'} className={`card p-4 flex gap-3 items-start ${n.read ? '' : 'ring-2 ring-saffron-100 bg-saffron-50'}`}>
          <span className="text-2xl">{ICON[n.type] || '🔔'}</span>
          <div className="flex-1">
            <p className="font-semibold">{lang === 'hi' && n.textHi ? n.textHi : n.text}</p>
            <p className="text-xs text-slate-500">{timeAgo(n.at, lang)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
