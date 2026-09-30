import { describe, it, expect, vi } from 'vitest';
import { getProfile } from './auth';

/**
 * A tiny stand-in for the PostgREST query the admin runs against `profile`, as seen
 * by the OWNER: RLS lets the owner read every profile, so an unfiltered query returns
 * all of them, and `.maybeSingle()` errors when more than one row matches — exactly
 * like the real API.
 */
const rows = [
  { user_id: 'owner-1', email: 'owner@example.com', display_name: null, role: 'owner', is_active: true },
  { user_id: 'staff-1', email: 'staff@example.com', display_name: null, role: 'staff', is_active: false },
];

function query(filtered: typeof rows) {
  return {
    eq: (col: 'user_id', value: string) => query(filtered.filter((r) => r[col] === value)),
    maybeSingle: async () =>
      filtered.length > 1
        ? { data: null, error: { code: 'PGRST116', message: 'multiple rows returned' } }
        : { data: filtered[0] ?? null, error: null },
  };
}

vi.mock('./client', () => ({
  getSupabaseClient: () => ({ from: () => ({ select: () => query(rows) }) }),
}));

describe('getProfile', () => {
  it("returns the signed-in owner's own profile even though the owner can read every profile", async () => {
    const profile = await getProfile('owner-1');
    expect(profile?.role).toBe('owner');
    expect(profile?.is_active).toBe(true);
  });

  it("returns a staff member's own profile", async () => {
    expect((await getProfile('staff-1'))?.email).toBe('staff@example.com');
  });

  it('returns null when the user has no profile', async () => {
    expect(await getProfile('nobody')).toBeNull();
  });
});
