import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { uploadMedia } from './storage';
import {
  OPEN_STATUSES,
  type AgendaJob,
  type Job,
  type JobFinding,
  type JobPart,
  type JobPhoto,
  type JobWithRefs,
  type PhotoStage,
} from './jobs';

// client + job_cost are owner-only: for staff PostgREST returns null for both embeds.
const JOB_WITH_REFS = '*, client(name), vehicle(registration), job_cost(labour_cost_kes)';

export type ClientJobRow = Pick<
  Job,
  'id' | 'job_number' | 'vehicle_id' | 'vehicle_label' | 'status' | 'checked_in_at'
>;

function useInvalidateJobs() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ['jobs'] });
    void qc.invalidateQueries({ queryKey: ['client-jobs'] });
    void qc.invalidateQueries({ queryKey: ['job-by-request'] });
    void qc.invalidateQueries({ queryKey: ['count'] });
    // Completing a job moves its request to `completed` (DB trigger).
    void qc.invalidateQueries({ queryKey: ['request'] });
    void qc.invalidateQueries({ queryKey: ['requests'] });
    if (id) void qc.invalidateQueries({ queryKey: ['job', id] });
  };
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async (): Promise<JobWithRefs[]> => {
      const { data, error } = await getDb()
        .from('job')
        .select(JOB_WITH_REFS)
        .order('checked_in_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as JobWithRefs[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    enabled: !!id,
    queryFn: async (): Promise<JobWithRefs | null> => {
      const { data, error } = await getDb()
        .from('job')
        .select(JOB_WITH_REFS)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as JobWithRefs) ?? null;
    },
  });
}

export function useJobByRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ['job-by-request', requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<{ id: string; job_number: string } | null> => {
      const { data, error } = await getDb()
        .from('job')
        .select('id, job_number')
        .eq('service_request_id', requestId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useClientJobs(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-jobs', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientJobRow[]> => {
      const { data, error } = await getDb()
        .from('job')
        .select('id, job_number, vehicle_id, vehicle_label, status, checked_in_at')
        .eq('client_id', clientId!)
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientJobRow[];
    },
  });
}

export function useCreateJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (row: Partial<Job>): Promise<string> => {
      const { data, error } = await getDb()
        .from('job')
        .insert(row as never)
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateJob(id: string) {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (patch: Partial<Job>) => {
      const { error } = await getDb()
        .from('job')
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getDb().from('job').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/* -- Child tables (findings, photos, parts) -------------------------------- */

export const jobChildKey = (table: string, jobId: string) =>
  ['job-children', table, jobId] as const;

function makeJobChild<T extends { id: string }>(table: string, select: string, orderBy: string) {
  const useList = (jobId: string) =>
    useQuery({
      queryKey: jobChildKey(table, jobId),
      queryFn: async (): Promise<T[]> => {
        const { data, error } = await getDb()
          .from(table)
          .select(select)
          .eq('job_id', jobId)
          .order(orderBy)
          .order('created_at');
        if (error) throw error;
        return (data ?? []) as unknown as T[];
      },
    });

  function useInvalidate(jobId: string) {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: jobChildKey(table, jobId) });
  }

  const useCreate = (jobId: string) => {
    const invalidate = useInvalidate(jobId);
    return useMutation({
      mutationFn: async (row: Partial<T>) => {
        const { error } = await getDb()
          .from(table)
          .insert({ ...row, job_id: jobId } as never);
        if (error) throw error;
      },
      onSuccess: invalidate,
    });
  };

  const useUpdate = (jobId: string) => {
    const invalidate = useInvalidate(jobId);
    return useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<T> }) => {
        const { error } = await getDb()
          .from(table)
          .update(patch as never)
          .eq('id', id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    });
  };

  const useRemove = (_jobId: string) => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await getDb().from(table).delete().eq('id', id);
        if (error) throw error;
      },
      // Deleting a finding unlinks its photos/parts (DB `on delete set null`) — refresh all.
      onSuccess: () => qc.invalidateQueries({ queryKey: ['job-children'] }),
    });
  };

  return { useList, useCreate, useUpdate, useRemove };
}

export const findings = makeJobChild<JobFinding>('job_finding', '*', 'display_order');
export const photos = makeJobChild<JobPhoto>(
  'job_photo',
  '*, media(storage_path, alt_text)',
  'display_order',
);
// job_part_cost is owner-only: null for staff.
export const parts = makeJobChild<JobPart>('job_part', '*, job_part_cost(cost_kes)', 'created_at');

/** Upload an image (EXIF stripped) and attach it to the job. */
export function useAddPhoto(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      file: File;
      stage: PhotoStage;
      findingId: string | null;
      alt: string;
    }) => {
      const mediaId = await uploadMedia(p.file, p.alt);
      const { error } = await getDb()
        .from('job_photo')
        .insert({ job_id: jobId, media_id: mediaId, stage: p.stage, finding_id: p.findingId });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobChildKey('job_photo', jobId) });
      void qc.invalidateQueries({ queryKey: ['media', 'list'] });
    },
  });
}

export interface NewPartInput {
  name: string;
  quantity: number;
  /** Owner only; staff always send null. */
  cost_kes: number | null;
  finding_id: string | null;
}

/** Adds a part; its cost (owner) goes to the owner-only job_part_cost table. */
export function useAddPart(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: NewPartInput) => {
      const db = getDb();
      const { data, error } = await db
        .from('job_part')
        .insert({ job_id: jobId, finding_id: p.finding_id, name: p.name, quantity: p.quantity })
        .select('id')
        .single();
      if (error) throw error;
      if (p.cost_kes !== null) {
        const { error: costError } = await db
          .from('job_part_cost')
          .upsert({ part_id: (data as { id: string }).id, cost_kes: p.cost_kes });
        if (costError) throw costError;
      }
    },
    // Settled, not success: a part saved without its cost must still show up.
    onSettled: () => qc.invalidateQueries({ queryKey: jobChildKey('job_part', jobId) }),
  });
}

/** Labour hours (shared) + labour cost (owner-only job_cost; omit costKes to leave it). */
export function useSaveLabour(jobId: string) {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (v: { hours: number | null; costKes?: number | null }) => {
      const db = getDb();
      const { error } = await db.from('job').update({ labour_hours: v.hours }).eq('id', jobId);
      if (error) throw error;
      if (v.costKes !== undefined) {
        const { error: costError } = await db
          .from('job_cost')
          .upsert({ job_id: jobId, labour_cost_kes: v.costKes });
        if (costError) throw costError;
      }
    },
    onSuccess: () => invalidate(jobId),
  });
}

/** Owner: link a walk-in job (and its client-less vehicle) to a client (D5). */
export function useLinkJobClient(job: Pick<Job, 'id' | 'vehicle_id'>) {
  const invalidate = useInvalidateJobs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const db = getDb();
      if (job.vehicle_id) {
        const { error } = await db
          .from('vehicle')
          .update({ client_id: clientId })
          .eq('id', job.vehicle_id)
          .is('client_id', null);
        if (error) throw error;
      }
      const { error } = await db.from('job').update({ client_id: clientId }).eq('id', job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(job.id);
      void qc.invalidateQueries({ queryKey: ['vehicle', 'list'] });
    },
  });
}

/** Job schedule (D6): open jobs with a booked date, soonest first. No customer data. */
export function useJobAgenda() {
  return useQuery({
    queryKey: ['jobs', 'agenda'],
    queryFn: async (): Promise<AgendaJob[]> => {
      const { data, error } = await getDb()
        .from('job')
        .select('id, job_number, vehicle_label, status, booked_at')
        .not('booked_at', 'is', null)
        .in('status', [...OPEN_STATUSES])
        .order('booked_at');
      if (error) throw error;
      return (data ?? []) as AgendaJob[];
    },
  });
}

// ---------------------------------------------------------------------------
// R-D: team assignment + clients from walk-ins
// ---------------------------------------------------------------------------

export interface JobAssignee {
  job_id: string;
  user_id: string;
  display_name: string | null;
  assigned_at: string;
}

export interface AssignablePerson {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: 'owner' | 'staff';
}

const assigneesKey = (jobId: string) => ['job-assignees', jobId] as const;

/** Who is on a job. Names come from a view because staff can't read other profiles. */
export function useJobAssignees(jobId: string) {
  return useQuery({
    queryKey: assigneesKey(jobId),
    queryFn: async (): Promise<JobAssignee[]> => {
      const { data, error } = await getDb()
        .from('job_assignee_named')
        .select('job_id, user_id, display_name, assigned_at')
        .eq('job_id', jobId)
        .order('assigned_at');
      if (error) throw error;
      return (data ?? []) as JobAssignee[];
    },
  });
}

/** Staff "My jobs": ids of the jobs assigned to this person. */
export function useMyAssignedJobIds(userId: string | null) {
  return useQuery({
    queryKey: ['job-assignees', 'mine', userId],
    enabled: userId !== null,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await getDb()
        .from('job_assignee')
        .select('job_id')
        .eq('user_id', userId!);
      if (error) throw error;
      return new Set(((data ?? []) as { job_id: string }[]).map((r) => r.job_id));
    },
  });
}

/** Owner: active team members who can be put on a job. */
export function useAssignablePeople(enabled = true) {
  return useQuery({
    queryKey: ['assignable-people'],
    enabled,
    queryFn: async (): Promise<AssignablePerson[]> => {
      const { data, error } = await getDb()
        .from('profile')
        .select('user_id, display_name, email, role')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return (data ?? []) as AssignablePerson[];
    },
  });
}

export function useAssignJob(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await getDb()
        .from('job_assignee')
        .insert({ job_id: jobId, user_id: userId });
      if (error) throw error;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['job-assignees'] });
      void qc.invalidateQueries({ queryKey: ['job-activity'] });
    },
  });
}

export function useUnassignJob(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await getDb()
        .from('job_assignee')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['job-assignees'] });
      void qc.invalidateQueries({ queryKey: ['job-activity'] });
    },
  });
}

export interface NewClientInput {
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * Owner: create a client from a walk-in job card (R-D D5). The vehicle recorded at
 * check-in is attached to the new client, and the job is linked to it.
 */
export function useCreateClientForJob(job: Pick<Job, 'id' | 'vehicle_id'>) {
  const invalidate = useInvalidateJobs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: NewClientInput): Promise<string> => {
      const db = getDb();
      const { data, error } = await db
        .from('client')
        .insert({ name: c.name, phone: c.phone, email: c.email, source: 'walk-in' })
        .select('id')
        .single();
      if (error) throw error;
      const clientId = (data as { id: string }).id;
      if (job.vehicle_id) {
        const { error: vErr } = await db
          .from('vehicle')
          .update({ client_id: clientId })
          .eq('id', job.vehicle_id)
          .is('client_id', null);
        if (vErr) throw vErr;
      }
      const { error: jErr } = await db.from('job').update({ client_id: clientId }).eq('id', job.id);
      if (jErr) throw jErr;
      return clientId;
    },
    onSuccess: () => {
      invalidate(job.id);
      void qc.invalidateQueries({ queryKey: ['client'] });
      void qc.invalidateQueries({ queryKey: ['vehicle'] });
    },
  });
}
