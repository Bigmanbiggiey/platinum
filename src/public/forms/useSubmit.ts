import { useCallback, useState } from 'react';
import { getSupabaseEnv } from '../../shared/env';

export type SubmitStatus = 'idle' | 'submitting' | 'ok' | 'error';
export type SubmitKind = 'service_request' | 'testimonial';

function submitUrl(): string | null {
  const override = import.meta.env.VITE_SUBMIT_URL;
  if (override) return override;
  const env = getSupabaseEnv();
  return env ? `${env.url}/functions/v1/submit` : null;
}

/**
 * Posts a form payload to the `submit` Edge Function (ADR-0006). Adds the honeypot,
 * submit-timing and (optional) Turnstile token. Never throws.
 */
export function useSubmit() {
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (
      kind: SubmitKind,
      payload: Record<string, unknown>,
      extras: { hp: string; startedAt: number; turnstileToken?: string },
    ) => {
      const url = submitUrl();
      if (!url) {
        setStatus('error');
        setError('The form is not configured yet. Please call or WhatsApp us instead.');
        return false;
      }
      setStatus('submitting');
      setError(null);
      const env = getSupabaseEnv();
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(env ? { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` } : {}),
          },
          body: JSON.stringify({
            kind,
            payload,
            hp: extras.hp,
            elapsedMs: Date.now() - extras.startedAt,
            turnstileToken: extras.turnstileToken,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
        if (res.ok && body.ok) {
          setStatus('ok');
          return true;
        }
        setStatus('error');
        setError('Something went wrong sending that. Please call or WhatsApp us.');
        return false;
      } catch {
        setStatus('error');
        setError('Network problem. Please call or WhatsApp us.');
        return false;
      }
    },
    [],
  );

  return { status, error, submit };
}
