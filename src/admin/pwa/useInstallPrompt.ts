import { useCallback, useEffect, useState } from 'react';

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

/**
 * iPhone/iPad Safari — the only iOS browser that installs web apps (no prompt event, so
 * the user follows Share → Add to Home Screen). iPadOS reports a Mac UA, hence the
 * touch check. Chrome/Firefox/Edge on iOS add CriOS/FxiOS/EdgiOS.
 */
export function isIosSafari(ua: string = navigator.userAgent): boolean {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/** Install state for the admin PWA (docs/superpowers/plans/2026-10-19-admin-pwa.md, Task 7). */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // no mini-infobar; our card offers it instead
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const prompt = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // the event can only be used once
  }, [deferred]);

  return { canPrompt: deferred !== null, prompt, installed, ios: isIosSafari() };
}
