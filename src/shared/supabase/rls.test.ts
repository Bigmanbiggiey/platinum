/**
 * RLS matrix check (docs/phase-2-plan.md §6, phase-3-plan.md §5) against the LIVE
 * linked project.
 *
 * - The anon block runs whenever `.env.local` provides `VITE_SUPABASE_*` (local dev);
 *   skipped in CI.
 * - The admin block additionally needs `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` in
 *   the environment (a throwaway admin account); skipped otherwise. It signs in and
 *   asserts full CRUD works AND that no anon restriction regressed.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const anon = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

// Not VITE_-prefixed on purpose — a throwaway admin credential, read only in the
// Node test runner, never bundled.
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

describe.skipIf(!anon)('RLS — anon role', () => {
  const db = anon!;

  it('CAN read published public read-models', async () => {
    for (const table of ['service', 'portfolio_project', 'partner', 'service_area', 'content_block']) {
      const { error } = await db.from(table).select('*').limit(1);
      expect(error, `${table} should be readable`).toBeNull();
    }
  });

  it('reads services/partners only where is_published', async () => {
    const { data } = await db.from('service').select('is_published');
    expect((data ?? []).every((r) => r.is_published === true)).toBe(true);
  });

  it('reads testimonials only via the approved-only view', async () => {
    const view = await db.from('testimonial_public').select('*');
    expect(view.error).toBeNull();
    const base = await db.from('testimonial').select('id');
    expect(base.error?.code).toBe('42501'); // permission denied
  });

  it('reads site settings only via the public view (no notification_* columns)', async () => {
    const view = await db.from('site_settings_public').select('*').maybeSingle();
    expect(view.error).toBeNull();
    expect(view.data).not.toHaveProperty('notification_email');
    const base = await db.from('site_settings').select('notification_email');
    expect(base.error?.code).toBe('42501');
  });

  it('CANNOT read service_request', async () => {
    const { error } = await db.from('service_request').select('id');
    expect(error?.code).toBe('42501');
  });

  it('CANNOT insert into service_request or testimonial directly', async () => {
    const sr = await db
      .from('service_request')
      .insert({ request_type: 'general_contact', contact_name: 'x', contact_phone: '1', consent: true });
    expect(sr.error?.code).toBe('42501');
    const t = await db
      .from('testimonial')
      .insert({ first_name: 'x', vehicle_label: 'y', comment: 'z', consent: true });
    expect(t.error?.code).toBe('42501');
  });

  it('CANNOT read the private admin tables (Phase 3)', async () => {
    for (const table of ['profile', 'client', 'vehicle', 'notification']) {
      const { error } = await db.from(table).select('*').limit(1);
      expect(error?.code, `${table} must be sealed from anon`).toBe('42501');
    }
  });
});

describe.skipIf(!anon || !adminEmail || !adminPassword)('RLS — authenticated admin', () => {
  let admin: SupabaseClient;

  beforeAll(async () => {
    admin = createClient(url!, key!, { auth: { persistSession: false } });
    const { error } = await admin.auth.signInWithPassword({
      email: adminEmail!,
      password: adminPassword!,
    });
    if (error) throw new Error(`admin sign-in failed: ${error.message}`);
  });

  afterAll(async () => {
    await admin?.auth.signOut();
  });

  it('can read its own profile with a role', async () => {
    const { data, error } = await admin.from('profile').select('role, is_active').maybeSingle();
    expect(error).toBeNull();
    expect(['owner', 'staff']).toContain(data?.role);
    expect(data?.is_active).toBe(true);
  });

  it('can read the private tables anon cannot', async () => {
    for (const table of ['client', 'vehicle', 'notification', 'service_request']) {
      const { error } = await admin.from(table).select('id').limit(1);
      expect(error, `${table} should be readable by admin`).toBeNull();
    }
  });

  it('can create + delete a client (full CRUD)', async () => {
    const ins = await admin
      .from('client')
      .insert({ name: 'RLS Test Client', type: 'individual' })
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    const id = ins.data!.id;
    const upd = await admin.from('client').update({ area: 'Kitengela' }).eq('id', id);
    expect(upd.error).toBeNull();
    const del = await admin.from('client').delete().eq('id', id);
    expect(del.error).toBeNull();
  });

  it('can moderate a testimonial and edit a content block', async () => {
    const t = await admin.from('testimonial').select('id').limit(1).maybeSingle();
    expect(t.error).toBeNull();
    const cb = await admin.from('content_block').select('key, value_md').limit(1).single();
    expect(cb.error).toBeNull();
    const restore = cb.data!.value_md;
    const upd = await admin
      .from('content_block')
      .update({ value_md: restore })
      .eq('key', cb.data!.key);
    expect(upd.error).toBeNull();
  });
});
