import { useQuery } from '@tanstack/react-query';
import { getDb } from './db';
import type { JobActivity, JobActivityWithJob } from './activity';

// staleTime 0: the log is written by DB triggers on other mutations, so refetch
// whenever the Activity tab or the Dashboard mounts instead of trusting a cache.

export function useJobActivity(jobId: string) {
  return useQuery({
    queryKey: ['job-activity', 'job', jobId],
    staleTime: 0,
    queryFn: async (): Promise<JobActivity[]> => {
      const { data, error } = await getDb()
        .from('job_activity')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as JobActivity[];
    },
  });
}

/** Owner Dashboard feed (spec §5): the latest entries across all jobs. */
export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ['job-activity', 'recent', limit],
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<JobActivityWithJob[]> => {
      const { data, error } = await getDb()
        .from('job_activity')
        .select('*, job(job_number, vehicle_label)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as JobActivityWithJob[];
    },
  });
}
