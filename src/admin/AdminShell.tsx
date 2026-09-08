import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/authContext';
import { signOut } from '../shared/supabase/auth';
import { AdminBrand } from './brand/AdminBrand';
import { NavIcon } from './components/NavIcon';
import { useUnreadCount } from './lib/notifications';

const baseNav = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/notifications', label: 'Notifications', icon: 'notifications', badge: true },
  { to: '/admin/requests', label: 'Requests', icon: 'requests' },
  { to: '/admin/schedule', label: 'Schedule', icon: 'schedule' },
  { to: '/admin/clients', label: 'Clients', icon: 'clients' },
  { to: '/admin/content', label: 'Website content', icon: 'content' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
] as const;

const NAV_KEY = 'pp_admin_nav_open';

/** Authenticated admin chrome: clean top bar + collapsible sidebar nav. */
export function AdminShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useUnreadCount();

  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(NAV_KEY);
      if (stored !== null) return stored === '1';
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(NAV_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  // Close the drawer on navigation (mobile).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) setOpen(false);
  }, [location.pathname]);

  const nav =
    profile?.role === 'owner'
      ? [...baseNav, { to: '/admin/team', label: 'Team', icon: 'team' as const }]
      : baseNav;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
      isActive
        ? 'bg-slate text-[color:var(--color-ink)]'
        : 'text-[color:var(--color-muted)] hover:bg-slate/40 hover:text-[color:var(--color-ink)]'
    }`;

  return (
    <div
      className="min-h-dvh bg-[color:var(--color-ground)] text-[color:var(--color-ink)]"
      data-theme="dark"
    >
      <header className="sticky top-0 z-30 border-b border-[color:var(--color-line)] bg-[color:var(--color-ground)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            aria-label={open ? 'Hide menu' : 'Show menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-[color:var(--color-line)] p-2 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            <NavIcon name="menu" />
          </button>
          <AdminBrand />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              View site ↗
            </a>
            <span className="hidden font-mono text-xs text-steel sm:inline">
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

      <div className="flex">
        {/* Backdrop (mobile only, when open) */}
        {open && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-30 bg-graphite/60 md:hidden"
          />
        )}

        <aside
          className={`fixed bottom-0 left-0 top-16 z-40 w-60 shrink-0 overflow-y-auto border-r border-[color:var(--color-line)] bg-[color:var(--color-ground)] p-3 transition-transform md:sticky md:bottom-auto md:z-0 md:h-[calc(100dvh-4rem)] md:transition-[margin,transform] ${
            open ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:-ml-60'
          }`}
        >
          <nav className="space-y-1" aria-label="Admin">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={'end' in n ? n.end : false} className={linkClass}>
                <NavIcon name={n.icon} />
                <span className="flex-1">{n.label}</span>
                {'badge' in n && n.badge && (unread.data ?? 0) > 0 && (
                  <span className="rounded-full bg-signal px-1.5 font-mono text-[10px] text-paper">
                    {unread.data}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 md:px-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
