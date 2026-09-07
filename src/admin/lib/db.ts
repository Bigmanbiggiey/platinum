import { getSupabaseClient } from '../../shared/supabase/client';

/** The Supabase client, guaranteed non-null inside the admin (env is always set). */
export function getDb() {
  const db = getSupabaseClient();
  if (!db) throw new Error('Supabase is not configured.');
  return db;
}

export const STATUSES = [
  'new',
  'contacted',
  'scheduled',
  'completed',
  'closed',
  'spam',
  'archived',
] as const;
export type RequestStatus = (typeof STATUSES)[number];

export const REQUEST_TYPES = [
  'booking',
  'general_repair',
  'diagnostics',
  'maintenance',
  'assessment',
  'road_test',
  'mechanical_inspection',
  'pre_purchase_inspection',
  'engineering',
  'other',
  'general_contact',
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export interface ServiceRequest {
  id: string;
  request_type: RequestType;
  status: RequestStatus;
  contact_name: string;
  contact_phone: string;
  contact_whatsapp: string | null;
  contact_email: string | null;
  vehicle_description: string | null;
  area: string | null;
  requested_date: string | null;
  requested_time_window: string | null;
  confirmed_at: string | null;
  message: string | null;
  source: string;
  client_id: string | null;
  vehicle_id: string | null;
  internal_notes: string | null;
  outcome_notes: string | null;
  created_at: string;
}

export const prettyType = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const statusTone = (s: RequestStatus) =>
  s === 'completed' || s === 'scheduled'
    ? ('pass' as const)
    : s === 'new'
      ? ('attention' as const)
      : s === 'spam' || s === 'archived' || s === 'closed'
        ? ('muted' as const)
        : ('neutral' as const);
