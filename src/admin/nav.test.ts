import { describe, it, expect } from 'vitest';
import { navFor } from './nav';

describe('navFor', () => {
  it('gives the owner everything plus Team', () => {
    expect(navFor('owner', { installed: true }).map((n) => n.label)).toEqual([
      'Dashboard',
      'Notifications',
      'Requests',
      'Jobs',
      'Schedule',
      'Clients',
      'Website content',
      'Settings',
      'Team',
    ]);
  });
  it('gives staff Jobs and Schedule only', () => {
    expect(navFor('staff', { installed: true }).map((n) => n.to)).toEqual([
      '/admin/jobs',
      '/admin/schedule',
    ]);
  });
  it('adds Install app last, drawer only, until the app is installed', () => {
    for (const role of ['owner', 'staff'] as const) {
      const last = navFor(role).at(-1);
      expect(last).toMatchObject({ to: '/admin/install', label: 'Install app', drawerOnly: true });
    }
  });
  it('gives nobody else anything', () => {
    expect(navFor(null)).toEqual([]);
  });
});
