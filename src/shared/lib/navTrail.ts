import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * In-site navigation that agrees with the phone's Back button
 * (docs/superpowers/plans/2026-10-20-mobile-phase-b.md, F1 + F2).
 *
 * - `useNavTrail()` (once per app shell) records, for each history entry, the page it
 *   was opened from.
 * - `<BackLink to>` (BackLink.tsx): when the previous entry *is* `to`, it goes back one step, exactly
 *   like the phone's Back (scroll position and list filters come back too). Otherwise
 *   it replaces the current entry with `to`, so the phone's Back never "undoes" it by
 *   returning to the page just left.
 * - `useScrollOnNavigate()` (admin; the public site uses React Router's
 *   ScrollRestoration): new pages open at the top; Back/Forward restore where you were.
 *
 * State lives in sessionStorage (per tab, survives reloads; history entry keys do too).
 */
const TRAIL_KEY = 'pms-nav-trail';
const SCROLL_KEY = 'pms-nav-scroll';
const memory: Record<string, Record<string, string | number>> = {};

function read<T extends string | number>(key: string): Record<string, T> {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw) as Record<string, T>;
  } catch {
    /* blocked storage: fall back to memory for this page view */
  }
  return (memory[key] ??= {}) as Record<string, T>;
}

function write(key: string, value: Record<string, string | number>) {
  memory[key] = value;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* memory copy is enough */
  }
}

/** The page the given history entry was opened from, if known. */
export function cameFrom(locationKey: string): string | undefined {
  return read<string>(TRAIL_KEY)[locationKey];
}

/** Record where each history entry came from. Call once in each app's shell. */
export function useNavTrail(): void {
  const location = useLocation();
  const type = useNavigationType();
  const prev = useRef<{ key: string; pathname: string } | null>(null);

  useEffect(() => {
    const from = prev.current;
    if (from && from.key !== location.key) {
      const trail = read<string>(TRAIL_KEY);
      if (type === 'PUSH') trail[location.key] = from.pathname;
      // A replaced entry keeps the "came from" of the one it replaced.
      else if (type === 'REPLACE' && trail[from.key]) trail[location.key] = trail[from.key];
      write(TRAIL_KEY, trail);
    }
    prev.current = { key: location.key, pathname: location.pathname };
  }, [location.key, location.pathname, type]);
}

/** Admin scroll handling: top on new pages, saved position on Back/Forward. */
export function useScrollOnNavigate(): void {
  const location = useLocation();
  const type = useNavigationType();
  const currentKey = useRef(location.key);

  // Keep the position of the entry being viewed up to date.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const saved = read<number>(SCROLL_KEY);
        saved[currentKey.current] = Math.round(window.scrollY);
        write(SCROLL_KEY, saved);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Layout effect: switch the tracked entry before paint, so a scroll event caused by
  // the new page's height is never saved against the page just left.
  useLayoutEffect(() => {
    if (currentKey.current === location.key) return;
    currentKey.current = location.key;
    const target = type === 'POP' ? (read<number>(SCROLL_KEY)[location.key] ?? 0) : 0;
    // After the new page has painted, so its height is there to scroll into.
    requestAnimationFrame(() => window.scrollTo({ top: target, left: 0, behavior: 'instant' }));
  }, [location.key, type]);
}
