import type { ReactNode } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth, useRole } from './auth/authContext';
import { NoAccess } from './RequireAuth';

/** Layout route for owner-only pages (RBAC spec §5). Staff get the no-access screen. */
export function RequireOwner() {
  const role = useRole();
  const { session } = useAuth();
  if (role !== 'owner') {
    return (
      <NoAccess
        email={session?.user?.email ?? null}
        message="This part of the admin is for the owner. Your account can use Jobs and Schedule."
        action={
          <Link
            to="/admin/jobs"
            className="inline-block font-semibold text-paper underline underline-offset-2"
          >
            Go to Jobs
          </Link>
        }
      />
    );
  }
  return <Outlet />;
}

/** `/admin`: the owner's Dashboard; staff land on Jobs (spec §5). */
export function RoleHome({ owner }: { owner: ReactNode }) {
  return useRole() === 'owner' ? <>{owner}</> : <Navigate to="/admin/jobs" replace />;
}
