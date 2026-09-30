import type { JobWithRefs } from '../../lib/jobs';

export function RepairTab({ job }: { job: JobWithRefs }) {
  return <p className="text-sm text-[color:var(--color-muted)]">{job.job_number}</p>;
}
