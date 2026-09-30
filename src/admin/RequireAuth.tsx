import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/authContext';
import { signOut } from '../shared/supabase/auth';

/** Route guard: unauthenticated → /admin/login; no admin profile → no-access notice. */
export function RequireAuth() {
  const { loading, session, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-dvh place-items-center text-sm text-platinum">Loading…</div>;
  }
  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (!profile || !profile.is_active) {
    return <NoAccess email={session.user?.email ?? null} />;
  }
  return <Outlet />;
}

/**
 * Signed in, but not an active admin. The login page bounces signed-in users back
 * here, so signing out is the only way to switch accounts — always offer it.
 */
function NoAccess({ email }: { email: string | null }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center text-sm text-platinum">
      <div className="space-y-4">
        <p>This account doesn&rsquo;t have admin access. Ask the owner to add you to the team.</p>
        {email && (
          <p className="text-xs text-steel">
            Signed in as <span className="font-mono text-platinum">{email}</span>
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void leave()}
          className="rounded-md border border-slate px-3 py-1.5 font-semibold text-paper hover:border-signal disabled:opacity-50"
        >
          {busy ? 'Signing out…' : 'Sign out and use another account'}
        </button>
      </div>
    </div>
  );
}
