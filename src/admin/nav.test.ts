import { describe, it, expect } from 'vitest';
import { navFor } from './nav';

describe('navFor', () => {
  it('gives the owner everything plus Team', () => {
    expect(navFor('owner').map((n) => n.label)).toEqual([
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
    expect(navFor('staff').map((n) => n.to)).toEqual(['/admin/jobs', '/admin/schedule']);
  });
  it('gives nobody else anything', () => {
    expect(navFor(null)).toEqual([]);
  });
});
