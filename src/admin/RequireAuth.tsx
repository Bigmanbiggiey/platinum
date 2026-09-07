import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth/authContext';

/** Route guard: unauthenticated → /admin/login; no admin profile → signed-out notice. */
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
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center text-sm text-platinum">
        This account doesn&rsquo;t have admin access. Ask the owner to add you to the team.
      </div>
    );
  }
  return <Outlet />;
}
