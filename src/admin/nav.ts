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
    | 'team';
  end?: boolean;
  badge?: boolean;
}

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

export function navFor(role: AdminRole | null): NavItem[] {
  if (role === 'owner') return OWNER_NAV;
  if (role === 'staff') return STAFF_NAV;
  return [];
}
