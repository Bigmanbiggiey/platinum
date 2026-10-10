import { useCallback, useEffect, useState } from 'react';
import { getDb } from './db';
import { getSupabaseEnv } from '../../shared/env';

const LAST_KEY = 'pp_admin_last_publish';
const DEBOUNCE_MS = 20_000;

/**
 * Publish → rebuild (ADR-0003). Calls the `rebuild` Edge Function, which POSTs a
 * Vercel Deploy Hook (URL kept server-side). No-ops cleanly until the hook secret is set.
 *
 * Edits are debounced 20s so a burst triggers one build; Publish/Update/Unpublish go
 * at once. One shared timer for the whole admin, and a pending rebuild is sent when
 * the tab is hidden or closed — closing the admin straight after a save no longer
 * drops it.
 */

type Listener = (message: string) => void;
const listeners = new Set<Listener>();
const announce = (message: string) => listeners.forEach((l) => l(message));

let timer: ReturnType<typeof setTimeout> | null = null;
let token: string | null = null;

async function fire(keepalive = false): Promise<void> {
  const env = getSupabaseEnv();
  if (!env) return;
  try {
    const res = await fetch(`${env.url}/functions/v1/rebuild`, {
      method: 'POST',
      keepalive,
      headers: { apikey: env.anonKey, Authorization: `Bearer ${token ?? env.anonKey}` },
    });
    // Website publishing is owner-only: staff edits simply don't rebuild.
    if (res.status === 403) return;
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; configured?: boolean };
    if (body.ok && body.configured) {
      announce('Your changes will be live on the website in ~1–2 minutes.');
      try {
        localStorage.setItem(LAST_KEY, new Date().toISOString());
      } catch {
        /* ignore */
      }
    } else {
      announce('Saved. (Auto-publish to the live site is not switched on yet.)');
    }
  } catch {
    announce('Saved. (Could not reach the publish service.)');
  }
}

/** Keep the session token to hand: a closing tab has no time to await it. */
async function refreshToken() {
  const {
    data: { session },
  } = await getDb().auth.getSession();
  token = session?.access_token ?? null;
}

function flushPending() {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
  void fire(true);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPending);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending();
  });
}

/** Rebuild after a burst of edits (debounced). */
export function scheduleRebuild() {
  void refreshToken();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void fire();
  }, DEBOUNCE_MS);
}

/** Rebuild now — Publish/Update/Unpublish. Also sends any pending debounced rebuild. */
export async function rebuildNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  await refreshToken();
  await fire();
}

export function usePublish() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    listeners.add(setMessage);
    return () => void listeners.delete(setMessage);
  }, []);

  /** Call after a successful save. Debounced. */
  const trigger = useCallback(() => {
    setMessage('Saved.');
    scheduleRebuild();
  }, []);

  /** Call after Publish/Update/Unpublish. */
  const triggerNow = useCallback(() => {
    setMessage('Saved.');
    void rebuildNow();
  }, []);

  const lastPublished = (() => {
    try {
      return localStorage.getItem(LAST_KEY);
    } catch {
      return null;
    }
  })();

  return { trigger, triggerNow, message, lastPublished };
}
