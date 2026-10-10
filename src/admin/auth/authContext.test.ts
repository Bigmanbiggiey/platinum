import { describe, it, expect } from 'vitest';
import { roleOf } from './authContext';
import type { AdminProfile } from '../../shared/supabase/auth';

const p = (over: Partial<AdminProfile>): AdminProfile => ({
  user_id: 'u1',
  email: 'a@b.co',
  display_name: 'A',
  role: 'staff',
  is_active: true,
  ...over,
});

describe('roleOf', () => {
  it('returns the role of an active profile', () => {
    expect(roleOf(p({ role: 'owner' }))).toBe('owner');
    expect(roleOf(p({ role: 'staff' }))).toBe('staff');
  });
  it('returns null for no profile or an inactive one', () => {
    expect(roleOf(null)).toBeNull();
    expect(roleOf(p({ role: 'owner', is_active: false }))).toBeNull();
  });
});
