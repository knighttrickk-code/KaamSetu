import { useCallback } from 'react';
import { useStore, me } from './store';
import { translate, roleOf, LANGS } from '../i18n';

/** One hook for everything a screen usually needs: state, current user, translations. */
export function useApp() {
  const s = useStore();
  const lang = s.lang || 'en';
  const t = useCallback((k, v) => translate(lang, k, v), [lang]);
  const roleLabel = useCallback((key) => roleOf(key)[lang] || roleOf(key).en, [lang]);
  const speechLang = (LANGS.find((l) => l.code === lang) || LANGS[0]).speech;
  return { s, user: me(s), lang, t, roleLabel, speechLang };
}

export const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function timeAgo(ts, lang = 'en') {
  const m = Math.round((Date.now() - ts) / 60000);
  const hi = lang === 'hi';
  if (m < 1) return hi ? 'अभी' : 'just now';
  if (m < 60) return hi ? `${m} मिनट पहले` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return hi ? `${h} घंटे पहले` : `${h}h ago`;
  const d = Math.round(h / 24);
  return hi ? `${d} दिन पहले` : `${d}d ago`;
}
