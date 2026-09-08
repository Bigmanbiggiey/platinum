import { useCallback, useRef, useState } from 'react';
import { getDb } from './db';
import { getSupabaseEnv } from '../../shared/env';

const LAST_KEY = 'pp_admin_last_publish';

/**
 * Publish → rebuild (ADR-0003). Calls the `rebuild` Edge Function, which POSTs a
 * Vercel Deploy Hook (URL kept server-side). Debounced 20s client-side so a burst of
 * edits triggers one build. No-ops cleanly until the hook secret is set.
 */
export function usePublish() {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback(async () => {
    const env = getSupabaseEnv();
    if (!env) return;
    try {
      const {
        data: { session },
      } = await getDb().auth.getSession();
      const res = await fetch(`${env.url}/functions/v1/rebuild`, {
        method: 'POST',
        headers: {
          apikey: env.anonKey,
          Authorization: `Bearer ${session?.access_token ?? env.anonKey}`,
        },
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; configured?: boolean };
      if (body.ok && body.configured) {
        setMessage('Your changes will be live on the website in ~1–2 minutes.');
        try {
          localStorage.setItem(LAST_KEY, new Date().toISOString());
        } catch {
          /* ignore */
        }
      } else {
        setMessage('Saved. (Auto-publish to the live site is not switched on yet.)');
      }
    } catch {
      setMessage('Saved. (Could not reach the publish service.)');
    }
  }, []);

  /** Call after a successful save. Debounced. */
  const trigger = useCallback(() => {
    setMessage('Saved.');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void fire(), 20_000);
  }, [fire]);

  const lastPublished = (() => {
    try {
      return localStorage.getItem(LAST_KEY);
    } catch {
      return null;
    }
  })();

  return { trigger, message, lastPublished };
}
