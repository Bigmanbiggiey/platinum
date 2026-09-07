import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/authContext';
import { signOut } from '../shared/supabase/auth';
import { AdminBrand } from './brand/AdminBrand';
import { useUnreadCount } from './lib/notifications';

const baseNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/notifications', label: 'Notifications', badge: true },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/schedule', label: 'Schedule' },
  { to: '/admin/clients', label: 'Clients' },
  { to: '/admin/content', label: 'Website content' },
  { to: '/admin/settings', label: 'Settings' },
];

/** Authenticated admin chrome — Rev 01 branding, nav, unread badge, View site link. */
export function AdminShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount();
  const nav =
    profile?.role === 'owner' ? [...baseNav, { to: '/admin/team', label: 'Team' }] : baseNav;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-2.5 py-1.5 text-sm font-semibold ${
      isActive
        ? 'bg-slate text-[color:var(--color-ink)]'
        : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
    }`;

  return (
    <div
      className="min-h-dvh bg-[color:var(--color-ground)] text-[color:var(--color-ink)]"
      data-theme="dark"
    >
      <header className="border-b border-[color:var(--color-line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <AdminBrand />
          <nav className="flex flex-wrap items-center gap-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                {n.label}
                {n.badge && (unread.data ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-signal px-1.5 font-mono text-[10px] text-paper">
                    {unread.data}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              View site ↗
            </a>
            <span className="font-mono text-xs text-steel">
              {profile?.display_name ?? profile?.email} · {profile?.role}
            </span>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/admin/login');
              }}
              className="rounded border border-[color:var(--color-line)] px-2 py-1 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
