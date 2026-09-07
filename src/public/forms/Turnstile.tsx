import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget (ADR-0006). Renders nothing unless
 * VITE_TURNSTILE_SITE_KEY is set — so forms work with honeypot-only until the owner
 * supplies keys. Calls `onToken` with the solved token.
 */
interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let widgetId: string | undefined;

    const mount = () => {
      if (!window.turnstile || !ref.current) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
      });
    };

    if (window.turnstile) {
      mount();
    } else if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = mount;
      document.head.appendChild(s);
    } else {
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          mount();
        }
      }, 200);
      return () => clearInterval(t);
    }

    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={ref} className="mt-2" />;
}
