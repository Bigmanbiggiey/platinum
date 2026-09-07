import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth/authContext';
import { signOut } from '../shared/supabase/auth';
import { getSupabaseClient } from '../shared/supabase/client';
import { BUSINESS } from '../shared/business';

const nav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/schedule', label: 'Schedule' },
  { to: '/admin/clients', label: 'Clients' },
  { to: '/admin/content', label: 'Website content' },
  { to: '/admin/settings', label: 'Settings' },
];

function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const db = getSupabaseClient();
      if (!db) return 0;
      const { count } = await db
        .from('notification')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

/** Authenticated admin chrome: nav, unread badge, "View site" link, sign out. */
export function AdminShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-2 text-sm font-semibold ${
      isActive ? 'bg-slate text-paper' : 'text-platinum hover:text-paper'
    }`;

  return (
    <div className="min-h-dvh bg-graphite text-paper" data-theme="dark">
      <header className="border-b border-slate/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-platinum">
            Platinum Point · Admin
          </span>
          <nav className="flex flex-wrap items-center gap-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                {n.label === 'Dashboard' && (unread.data ?? 0) > 0 ? (
                  <>
                    Dashboard{' '}
                    <span className="ml-1 rounded-full bg-signal px-1.5 text-xs text-paper">
                      {unread.data}
                    </span>
                  </>
                ) : (
                  n.label
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-platinum hover:text-paper"
            >
              View site ↗
            </a>
            <span className="text-steel">{profile?.display_name ?? BUSINESS.owner}</span>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/admin/login');
              }}
              className="rounded border border-slate px-2 py-1 text-platinum hover:text-paper"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
