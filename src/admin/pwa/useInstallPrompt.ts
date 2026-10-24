import { useCallback, useSyncExternalStore } from 'react';

/** Chrome / Edge / Samsung Internet's install event (not in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Running as the installed app (Android/desktop display-mode, or iOS home screen). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Any iPhone/iPad browser. iPadOS reports a Mac UA, hence the touch check. */
export function isIos(ua: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * iPhone/iPad Safari — the only iOS browser that installs web apps (no prompt event, so
 * the user follows Share → Add to Home Screen). Chrome/Firefox/Edge on iOS add
 * CriOS/FxiOS/EdgiOS.
 */
export function isIosSafari(ua: string = navigator.userAgent): boolean {
  return isIos(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/*
 * One store for the whole admin. Chrome fires `beforeinstallprompt` once, often before
 * sign-in finishes, so main.tsx starts listening at boot and every screen (Dashboard
 * card, ☰ menu, Install page) shares the same saved event.
 */
interface InstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
}

let state: InstallState = { deferred: null, installed: false };
let listening = false;
const subscribers = new Set<() => void>();

function set(next: Partial<InstallState>) {
  state = { ...state, ...next };
  subscribers.forEach((fn) => fn());
}

/** Start capturing the install event. Idempotent; called from main.tsx at boot. */
export function listenForInstallPrompt() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  state = { ...state, installed: isStandalone() };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // no mini-infobar; our card / menu offer it instead
    set({ deferred: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => set({ installed: true, deferred: null }));
}

/** Tests only: forget the saved event and re-read the display mode. */
export function resetInstallPromptForTests() {
  state = { deferred: null, installed: isStandalone() };
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => void subscribers.delete(fn);
}

/** Install state for the admin PWA (docs/superpowers/plans/2026-10-19-admin-pwa.md, Task 7). */
export function useInstallPrompt() {
  listenForInstallPrompt();
  const { deferred, installed } = useSyncExternalStore(subscribe, () => state);

  const prompt = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    set({ deferred: null }); // the event can only be used once
  }, [deferred]);

  return {
    canPrompt: deferred !== null,
    prompt,
    // Re-read each render: opening from the home screen fires no event.
    installed: installed || isStandalone(),
    ios: isIosSafari(),
  };
}
