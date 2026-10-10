import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../../auth/authContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageTitle,
  Select,
  Spinner,
} from '../../components/ui';
import { useJobs } from '../../lib/jobData';
import {
  jobStatusLabel,
  jobStatusTone,
  matchesJobFilter,
  matchesJobSearch,
  type JobListFilter,
} from '../../lib/jobs';

export function JobsPage() {
  const [filter, setFilter] = useState<JobListFilter>('open');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const q = useJobs();
  const isOwner = useRole() === 'owner';
  const rows = (q.data ?? []).filter(
    (j) => matchesJobFilter(j, filter) && matchesJobSearch(j, search),
  );

  return (
    <section>
      <PageTitle
        actions={
          <Button variant="accent" onClick={() => navigate('/admin/jobs/new')}>
            New job
          </Button>
        }
      >
        Jobs
      </PageTitle>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder={
            isOwner
              ? 'Search job number, client or registration…'
              : 'Search job number or registration…'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label="Show"
          value={filter}
          onChange={(e) => setFilter(e.target.value as JobListFilter)}
        >
          <option value="open">Open</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </Select>
      </div>

      {q.isLoading ? (
        <Spinner />
      ) : q.isError ? (
        <p className="text-sm text-signal">{(q.error as Error).message}</p>
      ) : rows.length === 0 ? (
        <EmptyState>
          {filter === 'open' && !search.trim()
            ? 'No open jobs. Start one from a request, or tap New job for a walk-in.'
            : 'No jobs match.'}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-[color:var(--color-line)] p-0">
          {rows.map((j) => (
            <Link
              key={j.id}
              to={`/admin/jobs/${j.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-[color:var(--color-ground)]"
            >
              <span className="font-mono text-xs text-steel">{j.job_number}</span>
              <span className="font-semibold text-[color:var(--color-ink)]">{j.vehicle_label}</span>
              {j.vehicle?.registration && (
                <span className="font-mono text-xs text-[color:var(--color-muted)]">
                  {j.vehicle.registration}
                </span>
              )}
              {isOwner && (
                <span className="text-sm text-[color:var(--color-muted)]">
                  {j.client?.name ?? 'No client'}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                <span className="font-mono text-[10px] text-steel">
                  {new Date(j.checked_in_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                </span>
                <Badge tone={jobStatusTone(j.status)}>{jobStatusLabel[j.status]}</Badge>
              </span>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
