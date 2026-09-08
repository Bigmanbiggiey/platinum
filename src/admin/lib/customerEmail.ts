import { useMutation } from '@tanstack/react-query';
import { getDb } from './db';
import { getSupabaseEnv } from '../../shared/env';

/** Ask the `notify-customer` function to email the customer after confirm/decline. */
export function useNotifyCustomer() {
  return useMutation({
    mutationFn: async ({
      requestId,
      kind,
    }: {
      requestId: string;
      kind: 'confirmed' | 'declined';
    }): Promise<{ sent: boolean; reason?: string }> => {
      const env = getSupabaseEnv();
      if (!env) return { sent: false, reason: 'not-configured' };
      const {
        data: { session },
      } = await getDb().auth.getSession();
      const res = await fetch(`${env.url}/functions/v1/notify-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.anonKey,
          Authorization: `Bearer ${session?.access_token ?? env.anonKey}`,
        },
        body: JSON.stringify({ requestId, kind }),
      });
      const body = (await res.json().catch(() => ({}))) as { sent?: boolean; reason?: string };
      return { sent: !!body.sent, reason: body.reason };
    },
  });
}
