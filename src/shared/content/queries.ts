/**
 * Content queries for the public site. Every function **degrades gracefully**: if
 * Supabase is unconfigured or the table does not exist yet (pre-migration), it
 * returns a safe empty value instead of throwing, so `npm run build` stays green and
 * pages fall back to their empty states.
 */
import { getSupabaseClient } from '../supabase/client';
import type {
  ContentBlockRow,
  MediaRow,
  PartnerRow,
  PortfolioProjectRow,
  ServiceAreaRow,
  ServiceRow,
  SiteSettingsPublicRow,
  TestimonialPublicRow,
} from '../supabase/types';

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (typeof console !== 'undefined')
      console.warn('[content] query failed, using fallback:', err);
    return fallback;
  }
}

export async function getSiteSettings(): Promise<SiteSettingsPublicRow | null> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return null;
    const { data, error } = await db.from('site_settings_public').select('*').maybeSingle();
    if (error) throw error;
    return (data as SiteSettingsPublicRow) ?? null;
  }, null);
}

export async function getContentBlocks(): Promise<Record<string, string>> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return {};
    const { data, error } = await db.from('content_block').select('key,value_md');
    if (error) throw error;
    return Object.fromEntries(
      ((data ?? []) as Pick<ContentBlockRow, 'key' | 'value_md'>[]).map((r) => [r.key, r.value_md]),
    );
  }, {});
}

export async function getServices(): Promise<ServiceRow[]> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return [];
    const { data, error } = await db
      .from('service')
      .select('*')
      .eq('is_published', true)
      .order('display_order');
    if (error) throw error;
    return (data ?? []) as ServiceRow[];
  }, []);
}

export async function getServiceBySlug(slug: string): Promise<ServiceRow | null> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return null;
    const { data, error } = await db
      .from('service')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    return (data as ServiceRow) ?? null;
  }, null);
}

export interface ProjectWithMedia extends PortfolioProjectRow {
  cover: MediaRow | null;
  gallery: MediaRow[];
}

export async function getProjects(): Promise<ProjectWithMedia[]> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return [];
    const { data, error } = await db
      .from('portfolio_project')
      .select('*, cover:cover_media_id(*), portfolio_media(display_order, media(*))')
      .eq('is_published', true)
      .order('display_order');
    if (error) throw error;
    return normaliseProjects(data ?? []);
  }, []);
}

export async function getProjectBySlug(slug: string): Promise<ProjectWithMedia | null> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return null;
    const { data, error } = await db
      .from('portfolio_project')
      .select('*, cover:cover_media_id(*), portfolio_media(display_order, media(*))')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    return data ? normaliseProjects([data])[0] : null;
  }, null);
}

/* eslint-disable @typescript-eslint/no-explicit-any -- shaping a nested PostgREST join result */
function normaliseProjects(rows: any[]): ProjectWithMedia[] {
  return rows.map((r) => ({
    ...(r as PortfolioProjectRow),
    cover: (r.cover as MediaRow) ?? null,
    gallery: ((r.portfolio_media ?? []) as any[])
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((pm) => pm.media as MediaRow)
      .filter(Boolean),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getTestimonials(): Promise<TestimonialPublicRow[]> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return [];
    const { data, error } = await db
      .from('testimonial_public')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TestimonialPublicRow[];
  }, []);
}

export async function getServiceAreas(): Promise<ServiceAreaRow[]> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return [];
    const { data, error } = await db.from('service_area').select('*').order('display_order');
    if (error) throw error;
    return (data ?? []) as ServiceAreaRow[];
  }, []);
}

export async function getPartners(): Promise<PartnerRow[]> {
  return safe(async () => {
    const db = getSupabaseClient();
    if (!db) return [];
    const { data, error } = await db
      .from('partner')
      .select('*')
      .eq('is_published', true)
      .order('display_order');
    if (error) throw error;
    return (data ?? []) as PartnerRow[];
  }, []);
}
