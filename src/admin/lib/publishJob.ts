/**
 * Publish a completed, consented job to the portfolio (jobs spec §5.5, J2 plan Task 5).
 * Owner only: `portfolio_project` is owner-only (RBAC R-B) and the database refuses to
 * publish a job that isn't completed with consent (publish guard).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import type { Job, JobPhoto } from './jobs';

export interface JobProject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  is_published: boolean;
}

const projectKey = (jobId: string) => ['portfolio-by-job', jobId] as const;

/** The job's portfolio entry, if it was ever published (kept on unpublish: stable slug). */
export function usePublishedProject(jobId: string, enabled = true) {
  return useQuery({
    queryKey: projectKey(jobId),
    enabled,
    queryFn: async (): Promise<JobProject | null> => {
      const { data, error } = await getDb()
        .from('portfolio_project')
        .select('id, slug, title, summary, is_published')
        .eq('job_id', jobId)
        .maybeSingle();
      if (error) throw error;
      return (data as JobProject) ?? null;
    },
  });
}

/** Why the job can't be published yet (empty = ready). Mirrors the DB publish guard. */
export function publishBlockers(job: Pick<Job, 'status' | 'public_consent'>): string[] {
  const reasons: string[] = [];
  if (job.status !== 'completed') reasons.push('The job isn’t completed yet.');
  if (!job.public_consent) {
    reasons.push('The client hasn’t agreed to the job being shown (Check-in tab).');
  }
  return reasons;
}

/** "Brake overhaul — 2014 Toyota Fielder", or just the vehicle without a service. */
export function defaultTitle(vehicleLabel: string, serviceTitle: string | null): string {
  return serviceTitle ? `${serviceTitle} — ${vehicleLabel}` : vehicleLabel;
}

/** First line of the complaint (spec §5.5). */
export function defaultSummary(complaint: string | null, vehicleLabel: string): string {
  const first = (complaint ?? '').split('\n')[0].trim();
  return first || `Work on a ${vehicleLabel}.`;
}

/** Cover: first public "after" photo, else the first public photo. */
export function pickCover(
  photos: Pick<JobPhoto, 'media_id' | 'stage' | 'is_public' | 'display_order' | 'created_at'>[],
): string | null {
  const shown = photos
    .filter((p) => p.is_public)
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at));
  return (shown.find((p) => p.stage === 'repair') ?? shown[0])?.media_id ?? null;
}

export interface PublishInput {
  existingId: string | null;
  slug: string;
  title: string;
  summary: string;
  serviceId: string | null;
  completedAt: string | null;
  coverMediaId: string | null;
  vehicle: { make: string; model: string | null; year: number | null } | null;
}

export function usePublishJob(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PublishInput) => {
      const row = {
        title: p.title,
        summary: p.summary,
        service_id: p.serviceId,
        project_date: p.completedAt ? p.completedAt.slice(0, 10) : null,
        cover_media_id: p.coverMediaId,
        vehicle_make: p.vehicle?.make ?? null,
        vehicle_model: p.vehicle?.model ?? null,
        vehicle_year: p.vehicle?.year ?? null,
        is_published: true,
      };
      const db = getDb();
      const { error } = p.existingId
        ? await db.from('portfolio_project').update(row).eq('id', p.existingId)
        : await db.from('portfolio_project').insert({ ...row, job_id: jobId, slug: p.slug });
      if (error) throw error;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: projectKey(jobId) });
      void qc.invalidateQueries({ queryKey: ['portfolio_project'] });
      void qc.invalidateQueries({ queryKey: ['job-activity'] });
    },
  });
}

export function useUnpublishJob(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await getDb()
        .from('portfolio_project')
        .update({ is_published: false })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: projectKey(jobId) });
      void qc.invalidateQueries({ queryKey: ['portfolio_project'] });
      void qc.invalidateQueries({ queryKey: ['job-activity'] });
    },
  });
}
