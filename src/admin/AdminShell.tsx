import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useRole } from './auth/authContext';
import { navFor } from './nav';
import { signOut } from '../shared/supabase/auth';
import { AdminBrand } from './brand/AdminBrand';
import { NavIcon } from './components/NavIcon';
import { useUnreadCount } from './lib/notifications';
import { ThemeSwitcher } from '../shared/ThemeSwitcher';
import { useMenuDismiss } from '../shared/lib/useMenuDismiss';
import { useMediaQuery } from '../shared/lib/useMediaQuery';
import { useFocusOnNavigate } from '../shared/lib/useFocusOnNavigate';

const NAV_KEY = 'pp_admin_nav_expanded';

/**
 * Admin chrome: clean top bar + a left sidebar that COLLAPSES to an icon rail.
 * The main content sits at a constant left offset (the rail width) on desktop, so
 * expanding/collapsing the sidebar overlays it and never reflows the page.
 * On mobile the sidebar is an off-canvas drawer.
 *
 * Phones (< 640 px): the header is ☰ + brand only. View site, theme, the signed-in
 * user and Sign out live in the drawer's account section (docs/superpowers/plans/
 * 2026-10-20-mobile-nav.md, A-2). Nothing in the header wraps at any width.
 */
export function AdminShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useRole();
  const unread = useUnreadCount(role === 'owner');
  const isMobile = useMediaQuery('(max-width: 767px)');

  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const closingForRoute = useRef(false);

  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem(NAV_KEY);
      if (s !== null) return s === '1';
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    try {
      localStorage.setItem(NAV_KEY, expanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [expanded]);

  // Collapse after navigating on mobile (the drawer would otherwise stay over the page);
  // focus then goes to the new page, not back to ☰.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (expandedRef.current) closingForRoute.current = true;
      setExpanded(false);
    }
  }, [location.pathname]);

  useFocusOnNavigate(mainRef);

  // The drawer is a modal-like overlay on phones only; the desktop rail never locks the page.
  const drawerOpen = expanded && isMobile;
  useMenuDismiss({
    open: drawerOpen,
    onClose: () => setExpanded(false),
    panelRef: drawerRef,
    toggleRef,
    inertSelectors: ['#admin-main'],
    focusOnClose: () => {
      const toPage = closingForRoute.current;
      closingForRoute.current = false;
      return toPage ? mainRef.current : toggleRef.current;
    },
  });

  const nav = navFor(role);

  const onSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold ${
      isActive
        ? 'bg-[color:var(--color-raised)] text-[color:var(--color-ink)]'
        : 'text-[color:var(--color-muted)] hover:bg-[color:var(--color-raised)]/40 hover:text-[color:var(--color-ink)]'
    }`;

  const who = profile?.display_name ?? profile?.email;

  return (
    <div className="min-h-dvh bg-[color:var(--color-ground)] text-[color:var(--color-ink)]">
      <header className="sticky top-0 z-40 h-16 border-b border-[color:var(--color-line)] bg-[color:var(--color-ground)]">
        <div className="flex h-full items-center gap-3 px-4">
          <button
            ref={toggleRef}
            type="button"
            aria-label="Menu"
            aria-expanded={expanded}
            aria-controls="admin-drawer"
            onClick={() => setExpanded((v) => !v)}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-md border border-[color:var(--color-line)] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            <NavIcon name="menu" />
          </button>
          <AdminBrand />
          <div className="ml-auto hidden items-center gap-3 whitespace-nowrap text-sm sm:flex">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              View site ↗
            </a>
            <ThemeSwitcher compact />
            <span className="hidden font-mono text-xs text-[color:var(--color-muted)] lg:inline">
              {who} · {profile?.role}
            </span>
            <button
              type="button"
              onClick={onSignOut}
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
          tabIndex={-1}
          onClick={() => setExpanded(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-graphite/60 md:hidden"
        />
      )}

      {/* Sidebar — fixed, so it overlays and never moves the page.
          Desktop: icon rail (w-16), expands to w-60 over the content.
          Mobile: off-canvas drawer (w-60), slides in from the left; inert while hidden
          so its links can't be tabbed to off-screen. */}
      <aside
        id="admin-drawer"
        ref={drawerRef}
        inert={isMobile && !expanded}
        className={`fixed bottom-0 left-0 top-16 z-40 flex flex-col overflow-y-auto overflow-x-hidden border-r border-[color:var(--color-line)] bg-[color:var(--color-ground)] py-3 transition-[width,transform] ${
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
              end={n.end ?? false}
              title={n.label}
              className={linkClass}
            >
              <span className="shrink-0">
                <NavIcon name={n.icon} />
              </span>
              <span className={expanded ? 'flex-1 truncate' : 'sr-only'}>{n.label}</span>
              {n.badge && (unread.data ?? 0) > 0 && (
                <span
                  className={`rounded-full bg-signal px-1.5 font-mono text-[10px] text-graphite ${
                    expanded ? '' : 'absolute right-1 top-1'
                  }`}
                >
                  {unread.data}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Account — phones only; the header carries these from 640 px up. */}
        <section
          aria-label="Account"
          className="mt-auto space-y-3 border-t border-[color:var(--color-line)] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-4 sm:hidden"
        >
          <p className="text-sm font-semibold">
            {who}
            <span className="block font-mono text-xs font-normal uppercase tracking-[0.15em] text-[color:var(--color-muted)]">
              {profile?.role}
            </span>
          </p>
          <ThemeSwitcher stacked />
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center rounded-md border border-[color:var(--color-line)] text-sm font-semibold"
          >
            View site ↗
          </a>
          <button
            type="button"
            onClick={onSignOut}
            className="flex min-h-11 w-full items-center justify-center rounded-md border border-[color:var(--color-line)] text-sm font-semibold"
          >
            Sign out
          </button>
        </section>
      </aside>

      <main
        id="admin-main"
        ref={mainRef}
        tabIndex={-1}
        className="px-4 py-8 outline-none md:pl-[calc(4rem+1.5rem)] md:pr-6"
      >
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
