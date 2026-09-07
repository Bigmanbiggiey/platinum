import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getProfile, getSession, onAuthChange } from '../../shared/supabase/auth';
import { AuthContext, type AuthState } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, session: null, profile: null });

  useEffect(() => {
    let active = true;

    const load = async (session: Session | null) => {
      if (!session) {
        if (active) setState({ loading: false, session: null, profile: null });
        return;
      }
      const profile = await getProfile();
      if (active) setState({ loading: false, session, profile });
    };

    void getSession().then(load);
    const unsub = onAuthChange((session) => void load(session));
    return () => {
      active = false;
      unsub();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
