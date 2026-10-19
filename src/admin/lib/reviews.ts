/**
 * Client reviews for a job (jobs spec D4, §5.4; J3 plan Task 5). Owner only: review
 * links and testimonials are owner-only in the database (RBAC R-B).
 *
 * A link's raw code exists only in the answer to `create_review_invite` — the database
 * keeps its hash — so the admin shows it once and can't show it again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { isOnWebsite } from './publishJob';
import { rebuildNow } from './rebuild';
import type { AdminTestimonial } from './resources';
import type { PublicTestimonial } from '../../shared/jobs/publicTimeline';

export interface ReviewInvite {
  id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

const inviteKey = (jobId: string) => ['review-invite', jobId] as const;
const jobTestimonialsKey = (jobId: string) => ['job-testimonials', jobId] as const;

/** The job's newest review link (status only — the code itself is never stored). */
export function useLatestReviewInvite(jobId: string) {
  return useQuery({
    queryKey: inviteKey(jobId),
    queryFn: async (): Promise<ReviewInvite | null> => {
      const { data, error } = await getDb()
        .from('review_invite')
        .select('id, expires_at, used_at, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ReviewInvite) ?? null;
    },
  });
}

/** Testimonials linked to the job, newest first. */
export function useJobTestimonials(jobId: string, enabled = true) {
  return useQuery({
    queryKey: jobTestimonialsKey(jobId),
    enabled,
    queryFn: async (): Promise<AdminTestimonial[]> => {
      const { data, error } = await getDb()
        .from('testimonial')
        .select('*')
        .eq('job_id', jobId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminTestimonial[];
    },
  });
}

/** What the job page shows: the latest approved, consented review (as `job_public`). */
export function publicReview(rows: AdminTestimonial[]): PublicTestimonial | null {
  const t = rows
    .filter((r) => r.status === 'approved' && r.consent)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
  return t
    ? {
        first_name: t.first_name,
        vehicle_label: t.vehicle_label,
        rating: t.rating,
        comment: t.comment,
        source: t.source,
      }
    : null;
}

/** Makes a new link (earlier unused ones stop working) and returns its code, once. */
export function useCreateReviewInvite(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await getDb().rpc('create_review_invite', { p_job_id: jobId });
      if (error) throw error;
      return data as string;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: inviteKey(jobId) });
      void qc.invalidateQueries({ queryKey: ['job-activity'] });
    },
  });
}

export interface OwnerTestimonialInput {
  firstName: string;
  vehicleLabel: string;
  rating: number | null;
  comment: string;
}

/** The owner adds the client's words for them — approved at once, labelled publicly. */
export function useAddOwnerTestimonial(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: OwnerTestimonialInput) => {
      const { error } = await getDb().from('testimonial').insert({
        first_name: t.firstName.trim(),
        vehicle_label: t.vehicleLabel.trim(),
        rating: t.rating,
        comment: t.comment.trim(),
        consent: true,
        source: 'owner_entered',
        status: 'approved',
        job_id: jobId,
      });
      if (error) throw error;
      if (await isOnWebsite(jobId)) await rebuildNow();
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: jobTestimonialsKey(jobId) });
      void qc.invalidateQueries({ queryKey: ['testimonial', 'list'] });
      void qc.invalidateQueries({ queryKey: ['job-activity'] });
    },
  });
}

export type InviteState =
  | { kind: 'none' }
  | { kind: 'sent'; sentAt: string; expiresAt: string }
  | { kind: 'used'; usedAt: string }
  | { kind: 'expired' };

export function inviteState(invite: ReviewInvite | null, now = new Date()): InviteState {
  if (!invite) return { kind: 'none' };
  if (invite.used_at) return { kind: 'used', usedAt: invite.used_at };
  if (new Date(invite.expires_at) <= now) return { kind: 'expired' };
  return { kind: 'sent', sentAt: invite.created_at, expiresAt: invite.expires_at };
}

export function reviewUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/review/${code}`;
}

/**
 * A number wa.me accepts: digits only, Kenyan local numbers (07…, 01…, 7…, 1…) as 254….
 * Null when there's nothing usable.
 */
export function waNumber(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  if (/^0[17]\d{8}$/.test(d)) return `254${d.slice(1)}`;
  if (/^[17]\d{8}$/.test(d)) return `254${d}`;
  if (/^\d{10,15}$/.test(d)) return d;
  return null;
}

export function reviewMessage(clientName: string, vehicle: string, url: string): string {
  const first = clientName.trim().split(/\s+/)[0] || 'there';
  return `Hi ${first}, thanks for choosing Platinum Motor Services. How did we do on your ${vehicle}? Leave a quick review here: ${url}`;
}

export function whatsappTo(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
