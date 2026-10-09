// Platinum Point — identify the signed-in caller of an Edge Function.
//
// Must filter the profile by the caller's user id: RLS lets an owner read EVERY
// profile, so an unfiltered `profile … maybeSingle()` errors as soon as a second
// account exists — which returned 403 to the owner (spec §1.3, §6.2). Mirrors the
// getProfile(userId) fix in src/shared/supabase/auth.ts.

import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface CallerProfile {
  userId: string;
  email: string | null;
  /** The auth user's own email (never stale, unlike the profile copy). */
  authEmail: string | null;
  role: 'owner' | 'staff';
  isActive: boolean;
}

export async function getCaller(req: Request): Promise<CallerProfile | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;

  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await caller.auth.getUser(jwt);
  if (!user) return null;

  const { data } = await caller
    .from('profile')
    .select('role, is_active, email')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return null;

  return {
    userId: user.id,
    email: (data.email as string | null) ?? user.email ?? null,
    authEmail: user.email ?? null,
    role: data.role as 'owner' | 'staff',
    isActive: data.is_active === true,
  };
}
