import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { getSupabaseEnv } from '../../shared/env';
import { inviteErrorMessage } from './inviteShare';

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

export interface InviteInput {
  email: string;
  displayName: string;
  role: 'owner' | 'staff';
}

export interface InviteResult {
  inviteUrl: string;
  email: string;
  displayName: string;
  role: 'owner' | 'staff';
  /** The email already had an account — the link sets a new password instead. */
  existed: boolean;
}

/** Calls the owner-only `admin-invite` Edge Function; returns a shareable link. */
export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteInput): Promise<InviteResult> => {
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
        body: JSON.stringify({
          email: input.email,
          display_name: input.displayName,
          role: input.role,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        inviteUrl?: string;
        existed?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.inviteUrl) throw new Error(inviteErrorMessage(body.error));
      return {
        inviteUrl: body.inviteUrl,
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        existed: body.existed === true,
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
