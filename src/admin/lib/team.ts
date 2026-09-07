import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { getSupabaseEnv } from '../../shared/env';

export interface TeamMember {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: 'owner' | 'staff';
  is_active: boolean;
  created_at: string;
}

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await getDb()
        .from('profile')
        .select('user_id, email, display_name, role, is_active, created_at')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
}

/** Toggle active / role on an existing member (owner-only via RLS). */
export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      patch,
    }: {
      userId: string;
      patch: Partial<Pick<TeamMember, 'is_active' | 'role' | 'display_name'>>;
    }) => {
      const { error } = await getDb().from('profile').update(patch).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

/** Calls the owner-only `admin-invite` Edge Function; returns an invite link. */
export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, displayName }: { email: string; displayName?: string }) => {
      const env = getSupabaseEnv();
      if (!env) throw new Error('Not configured.');
      const {
        data: { session },
      } = await getDb().auth.getSession();
      const res = await fetch(`${env.url}/functions/v1/admin-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.anonKey,
          Authorization: `Bearer ${session?.access_token ?? env.anonKey}`,
        },
        body: JSON.stringify({ email, display_name: displayName }),
      });
      const body = (await res.json()) as { ok?: boolean; inviteUrl?: string; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'Invite failed.');
      return body.inviteUrl ?? '';
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
