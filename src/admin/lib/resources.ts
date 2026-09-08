import { makeResource } from './crud';
import type {
  ContentBlockRow,
  MediaRow,
  PartnerRow,
  PortfolioProjectRow,
  ServiceAreaRow,
  ServiceRow,
} from '../../shared/supabase/types';

/* -- Admin row shapes (fuller than the public read models) ----------------- */

export interface AdminTestimonial {
  id: string;
  first_name: string;
  vehicle_label: string;
  rating: number | null;
  comment: string;
  consent: boolean;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  submitted_at: string;
}

export interface AdminSiteSettings {
  id: boolean;
  business_name: string;
  legal_name: string | null;
  tagline: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  hours: { days: string; open: string; close: string; label: string }[];
  base_area: string;
  social_links: Record<string, string>;
  gbp_url: string | null;
  default_seo: { title?: string; description?: string; ogImage?: string };
  notification_channel: string;
  notification_email: string | null;
}

export interface AdminClient {
  id: string;
  name: string;
  type: 'individual' | 'fleet';
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  area: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface AdminVehicle {
  id: string;
  client_id: string;
  make: string;
  model: string | null;
  year: number | null;
  registration: string | null;
  vin: string | null;
  colour: string | null;
  mileage: number | null;
  fuel: string | null;
  transmission: string | null;
  notes: string | null;
}

/* -- Resource hooks ------------------------------------------------------- */

export const services = makeResource<ServiceRow>('service', { orderBy: 'display_order' });
export const projects = makeResource<PortfolioProjectRow>('portfolio_project', {
  orderBy: 'display_order',
});
export const testimonials = makeResource<AdminTestimonial>('testimonial', {
  orderBy: 'submitted_at',
  ascending: false,
});
export const contentBlocks = makeResource<ContentBlockRow & { id: string }>('content_block', {
  orderBy: 'key',
});
export const serviceAreas = makeResource<ServiceAreaRow>('service_area', {
  orderBy: 'display_order',
});
export const partners = makeResource<PartnerRow>('partner', { orderBy: 'display_order' });
export const media = makeResource<MediaRow>('media', { orderBy: 'created_at', ascending: false });
export const clients = makeResource<AdminClient>('client', {
  orderBy: 'created_at',
  ascending: false,
});
export const vehicles = makeResource<AdminVehicle>('vehicle', { orderBy: 'created_at' });
