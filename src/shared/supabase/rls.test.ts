/**
 * RLS matrix check (docs/phase-2-plan.md §6) against the LIVE linked project.
 *
 * Runs only when `.env.local` provides Supabase credentials (local dev). Skipped in
 * CI, where those are absent. Uses a bare anon client — the same role the public
 * site (build + browser) uses.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const anon = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

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
});
