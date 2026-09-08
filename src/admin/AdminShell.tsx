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

const NAV_KEY = 'pp_admin_nav_expanded';

/**
 * Admin chrome: clean top bar + a left sidebar that COLLAPSES to an icon rail.
 * The main content sits at a constant left offset (the rail width) on desktop, so
 * expanding/collapsing the sidebar overlays it and never reflows the page.
 * On mobile the sidebar is an off-canvas drawer.
 */
export function AdminShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useUnreadCount();

  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem(NAV_KEY);
      if (s !== null) return s === '1';
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(NAV_KEY, expanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [expanded]);

  // Collapse after navigating on mobile (the drawer would otherwise stay over the page).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) setExpanded(false);
  }, [location.pathname]);

  const nav =
    profile?.role === 'owner'
      ? [...baseNav, { to: '/admin/team', label: 'Team', icon: 'team' as const }]
      : baseNav;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${
      isActive
        ? 'bg-slate text-[color:var(--color-ink)]'
        : 'text-[color:var(--color-muted)] hover:bg-slate/40 hover:text-[color:var(--color-ink)]'
    }`;

  return (
    <div
      className="min-h-dvh bg-[color:var(--color-ground)] text-[color:var(--color-ink)]"
      data-theme="dark"
    >
      <header className="sticky top-0 z-40 h-16 border-b border-[color:var(--color-line)] bg-[color:var(--color-ground)]">
        <div className="flex h-full items-center gap-3 px-4">
          <button
            type="button"
            aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
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

      {/* Backdrop — mobile only, when the drawer is open */}
      {expanded && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setExpanded(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-graphite/60 md:hidden"
        />
      )}

      {/* Sidebar — fixed, so it overlays and never moves the page.
          Desktop: icon rail (w-16), expands to w-60 over the content.
          Mobile: off-canvas drawer (w-60), slides in from the left. */}
      <aside
        className={`fixed bottom-0 left-0 top-16 z-40 overflow-y-auto overflow-x-hidden border-r border-[color:var(--color-line)] bg-[color:var(--color-ground)] py-3 transition-[width,transform] ${
          expanded
            ? 'w-60 translate-x-0 shadow-[10px_0_30px_rgba(0,0,0,0.45)] md:shadow-[10px_0_30px_rgba(0,0,0,0.45)]'
            : '-translate-x-full shadow-none md:w-16 md:translate-x-0'
        }`}
      >
        <nav className="space-y-1 px-2" aria-label="Admin">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={'end' in n ? n.end : false}
              title={n.label}
              className={linkClass}
            >
              <span className="shrink-0">
                <NavIcon name={n.icon} />
              </span>
              <span className={expanded ? 'flex-1 truncate' : 'sr-only'}>{n.label}</span>
              {'badge' in n && n.badge && (unread.data ?? 0) > 0 && (
                <span
                  className={`rounded-full bg-signal px-1.5 font-mono text-[10px] text-paper ${
                    expanded ? '' : 'absolute right-1 top-1'
                  }`}
                >
                  {unread.data}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="px-4 py-8 md:pl-[calc(4rem+1.5rem)] md:pr-6">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
