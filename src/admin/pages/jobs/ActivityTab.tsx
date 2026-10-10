import { Card, Spinner } from '../../components/ui';
import { ActivityList } from '../../components/ActivityList';
import { useJobActivity } from '../../lib/activityData';
import type { JobWithRefs } from '../../lib/jobs';

/** Who did what on this job (spec §5). Owner and staff both see it. */
export function ActivityTab({ job }: { job: Pick<JobWithRefs, 'id'> }) {
  const q = useJobActivity(job.id);
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <p className="text-sm text-signal">{(q.error as Error).message}</p>;
  return (
    <Card className="p-0">
      <ActivityList items={q.data ?? []} />
    </Card>
  );
}
