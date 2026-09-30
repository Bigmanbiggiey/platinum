import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { uploadMedia } from './storage';
import type { Job, JobFinding, JobPart, JobPhoto, JobWithRefs, PhotoStage } from './jobs';

const JOB_WITH_REFS = '*, client(name), vehicle(registration)';

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
export const parts = makeJobChild<JobPart>('job_part', '*', 'created_at');

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
