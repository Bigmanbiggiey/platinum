/**
 * Database row types — hand-written to match `supabase/migrations/*`.
 *
 * Once the CLI is authenticated we replace this with
 * `npx supabase gen types typescript --linked > src/shared/supabase/types.ts`.
 * Until then this is the contract; keep it in sync with the migrations.
 */

export type RequestType =
  | 'booking'
  | 'general_repair'
  | 'diagnostics'
  | 'maintenance'
  | 'assessment'
  | 'road_test'
  | 'mechanical_inspection'
  | 'pre_purchase_inspection'
  | 'engineering'
  | 'other'
  | 'general_contact';

export interface ServiceRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  summary: string;
  description_md: string;
  whats_included_md: string | null;
  faqs: { q: string; a: string }[];
  icon: string | null;
  display_order: number;
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
}

export interface MediaRow {
  id: string;
  storage_path: string;
  alt_text: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

export interface PortfolioProjectRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  summary: string;
  body_md: string;
  outcome: string | null;
  service_id: string | null;
  project_date: string | null;
  cover_media_id: string | null;
  is_published: boolean;
  display_order: number;
}

export interface TestimonialPublicRow {
  id: string;
  first_name: string;
  vehicle_label: string;
  rating: number | null;
  comment: string;
  is_featured: boolean;
  submitted_at: string;
}

export interface ContentBlockRow {
  key: string;
  label: string;
  group: string;
  value_md: string;
}

export interface ServiceAreaRow {
  id: string;
  name: string;
  region: string | null;
  is_primary: boolean;
  note: string | null;
  display_order: number;
}

export interface PartnerRow {
  id: string;
  name: string;
  type: 'bodywork' | 'garage' | 'parts' | 'other';
  note: string | null;
  area: string | null;
  display_order: number;
  is_published: boolean;
}

export interface HoursEntry {
  days: string;
  open: string;
  close: string;
  label: string;
}

export interface SiteSettingsPublicRow {
  business_name: string;
  legal_name: string | null;
  tagline: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  hours: HoursEntry[];
  base_area: string;
  geo: { lat: number; lng: number } | null;
  social_links: Record<string, string>;
  gbp_url: string | null;
  default_seo: { title?: string; description?: string; ogImage?: string };
}
