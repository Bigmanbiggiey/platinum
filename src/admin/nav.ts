import type { AdminRole } from './auth/authContext';

export interface NavItem {
  to: string;
  label: string;
  icon:
    | 'dashboard'
    | 'notifications'
    | 'requests'
    | 'jobs'
    | 'schedule'
    | 'clients'
    | 'content'
    | 'settings'
    | 'team'
    | 'install';
  end?: boolean;
  badge?: boolean;
  /** In the ☰ drawer / rail only, never a staff bottom tab. */
  drawerOnly?: boolean;
}

/** Owner and staff; gone once the app is installed. */
const INSTALL: NavItem = {
  to: '/admin/install',
  label: 'Install app',
  icon: 'install',
  drawerOnly: true,
};

const OWNER_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/notifications', label: 'Notifications', icon: 'notifications', badge: true },
  { to: '/admin/requests', label: 'Requests', icon: 'requests' },
  { to: '/admin/jobs', label: 'Jobs', icon: 'jobs' },
  { to: '/admin/schedule', label: 'Schedule', icon: 'schedule' },
  { to: '/admin/clients', label: 'Clients', icon: 'clients' },
  { to: '/admin/content', label: 'Website content', icon: 'content' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
  { to: '/admin/team', label: 'Team', icon: 'team' },
];

/** Staff: jobs & the job schedule only (D2, D6). */
const STAFF_NAV: NavItem[] = [
  { to: '/admin/jobs', label: 'Jobs', icon: 'jobs' },
  { to: '/admin/schedule', label: 'Schedule', icon: 'schedule' },
];

export function navFor(
  role: AdminRole | null,
  { installed = false }: { installed?: boolean } = {},
): NavItem[] {
  const base = role === 'owner' ? OWNER_NAV : role === 'staff' ? STAFF_NAV : [];
  return base.length && !installed ? [...base, INSTALL] : base;
}
