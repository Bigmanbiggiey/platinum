import { useSyncExternalStore } from 'react';

/**
 * Light / dark / system theme (public site + admin).
 *
 * - "system" = nothing stored: CSS follows `prefers-color-scheme`, so the site works
 *   the same with no JS at all.
 * - "light" / "dark" are stored in localStorage and applied as `<html data-theme>`,
 *   which src/index.css already honours in both directions.
 * - The inline script in index.html / admin.html applies the stored value before first
 *   paint (no flash); this module keeps it in sync afterwards, across tabs too.
 *
 * Keep STORAGE_KEY and the colours below in step with that inline script.
 */
export type ThemePref = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

export const STORAGE_KEY = 'color-scheme';
const THEME_COLOR: Record<Scheme, string> = { light: '#f7f7f5', dark: '#14171a' };
const DARK_QUERY = '(prefers-color-scheme: dark)';
const CHANGE = 'pp:theme-change';

export function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function systemScheme(): Scheme {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches
    ? 'dark'
    : 'light';
}

/** Reflect a preference on <html> and the colour-scheme / theme-color metas. */
export function applyPref(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;

  const scheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (scheme) scheme.content = pref === 'system' ? 'light dark' : pref;

  // Two media-scoped theme-color metas: when pinned, both show the pinned colour.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const forDark = (m.media ?? '').includes('dark');
    m.content = THEME_COLOR[pref === 'system' ? (forDark ? 'dark' : 'light') : pref];
  });
}

export function setPref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* Blocked storage: still apply for this page view. */
  }
  applyPref(pref);
  window.dispatchEvent(new Event(CHANGE));
}

// One snapshot string so useSyncExternalStore can compare cheaply: "<pref>:<system>".
type Snapshot = `${ThemePref}:${Scheme}`;
const snapshot = (): Snapshot => `${readPref()}:${systemScheme()}`;
const serverSnapshot = (): Snapshot => 'system:light';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.(DARK_QUERY);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    applyPref(readPref()); // another tab changed it
    onChange();
  };
  window.addEventListener(CHANGE, onChange);
  window.addEventListener('storage', onStorage);
  mq?.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener('storage', onStorage);
    mq?.removeEventListener('change', onChange);
  };
}

/** The stored preference, what "system" currently resolves to, and the scheme in use. */
export function useTheme() {
  const snap = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [pref, system] = snap.split(':') as [ThemePref, Scheme];
  return { pref, system, resolved: pref === 'system' ? system : pref, setPref };
}
