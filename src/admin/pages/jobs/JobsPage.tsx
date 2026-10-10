import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useRole } from '../../auth/authContext';
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
import { useJobs, useMyAssignedJobIds } from '../../lib/jobData';
import {
  jobStatusLabel,
  jobStatusTone,
  matchesJobFilter,
  matchesJobSearch,
  splitMyJobs,
  type JobListFilter,
  type JobWithRefs,
} from '../../lib/jobs';

const FILTERS: JobListFilter[] = ['open', 'review', 'completed', 'cancelled', 'all'];
const NO_IDS: ReadonlySet<string> = new Set();

export function JobsPage() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((f) => f === params.get('show')) ?? 'open';
  const setFilter = (f: JobListFilter) =>
    setParams(f === 'open' ? {} : { show: f }, { replace: true });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const q = useJobs();
  const isOwner = useRole() === 'owner';
  const userId = useAuth().profile?.user_id ?? null;
  const mine = useMyAssignedJobIds(isOwner ? null : userId);
  const all = q.data ?? [];
  const rows = all.filter((j) => matchesJobFilter(j, filter) && matchesJobSearch(j, search));
  const toReview = all.filter((j) => j.status === 'awaiting_review').length;

  const list = (jobs: JobWithRefs[]) => (
    <Card className="divide-y divide-[color:var(--color-line)] p-0">
      {jobs.map((j) => (
        <JobRow key={j.id} job={j} showClient={isOwner} />
      ))}
    </Card>
  );

  let body;
  if (rows.length === 0) {
    body = (
      <EmptyState>
        {filter === 'open' && !search.trim()
          ? 'No open jobs. Start one from a request, or tap New job for a walk-in.'
          : filter === 'review' && !search.trim()
            ? 'Nothing waiting for your review.'
            : 'No jobs match.'}
      </EmptyState>
    );
  } else if (isOwner) {
    body = list(rows);
  } else {
    // Staff (R-D D4): their own jobs first; they can still open the rest.
    const split = splitMyJobs(rows, mine.data ?? NO_IDS, userId);
    body = (
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 font-semibold text-[color:var(--color-ink)]">My jobs</h2>
          {split.mine.length > 0 ? (
            list(split.mine)
          ) : (
            <EmptyState>Nothing assigned to you here.</EmptyState>
          )}
        </div>
        {split.others.length > 0 && (
          <div>
            <h2 className="mb-2 font-semibold text-[color:var(--color-ink)]">Other jobs</h2>
            {list(split.others)}
          </div>
        )}
      </div>
    );
  }

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
          <option value="review">{isOwner ? `To review (${toReview})` : 'Awaiting review'}</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </Select>
      </div>

      {q.isLoading ? (
        <Spinner />
      ) : q.isError ? (
        <p className="text-sm text-signal">{(q.error as Error).message}</p>
      ) : (
        body
      )}
    </section>
  );
}

function JobRow({ job: j, showClient }: { job: JobWithRefs; showClient: boolean }) {
  return (
    <Link
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
      {showClient && (
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
  );
}
