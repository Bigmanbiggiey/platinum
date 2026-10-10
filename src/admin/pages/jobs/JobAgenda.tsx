import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, Spinner } from '../../components/ui';
import { useJobAgenda } from '../../lib/jobData';
import {
  agendaDayLabel,
  groupAgendaByDay,
  jobStatusLabel,
  jobStatusTone,
  type AgendaJob,
} from '../../lib/jobs';

/** Job schedule (D6): job number, vehicle, status by booked day — no customer data. */
export function JobAgendaList({ jobs }: { jobs: AgendaJob[] }) {
  return (
    <div className="space-y-4">
      {groupAgendaByDay(jobs).map((d) => (
        <div key={d.day}>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            {agendaDayLabel(d.day)}
          </h3>
          <Card className="divide-y divide-[color:var(--color-line)] p-0">
            {d.jobs.map((j) => (
              <Link
                key={j.id}
                to={`/admin/jobs/${j.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-[color:var(--color-ground)]"
              >
                <span className="font-mono text-xs text-steel">{j.job_number}</span>
                <span className="font-semibold text-[color:var(--color-ink)]">
                  {j.vehicle_label}
                </span>
                <span className="ml-auto">
                  <Badge tone={jobStatusTone(j.status)}>{jobStatusLabel[j.status]}</Badge>
                </span>
              </Link>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

export function JobAgendaSection() {
  const q = useJobAgenda();
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <p className="text-sm text-signal">{(q.error as Error).message}</p>;
  if ((q.data ?? []).length === 0) {
    return <EmptyState>No open jobs with a booked date.</EmptyState>;
  }
  return <JobAgendaList jobs={q.data!} />;
}
