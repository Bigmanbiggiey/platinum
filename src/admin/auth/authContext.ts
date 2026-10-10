import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AdminProfile } from '../../shared/supabase/auth';

export interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: AdminProfile | null;
}

export const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  profile: null,
});

export const useAuth = () => useContext(AuthContext);

export type AdminRole = 'owner' | 'staff';

/** The admin role of a profile, or null when there is no ACTIVE profile. */
export function roleOf(profile: AdminProfile | null): AdminRole | null {
  return profile?.is_active ? profile.role : null;
}

/** The signed-in person's role (RBAC spec §5). The database enforces it; this mirrors it. */
export const useRole = (): AdminRole | null => roleOf(useAuth().profile);
