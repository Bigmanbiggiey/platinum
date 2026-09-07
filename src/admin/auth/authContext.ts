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
