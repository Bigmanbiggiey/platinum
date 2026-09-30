import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Card, EmptyState, Labeled, PageTitle, Select, Spinner } from '../../components/ui';
import { useJob, useUpdateJob } from '../../lib/jobData';
import {
  JOB_STATUSES,
  jobStatusLabel,
  jobStatusTone,
  type JobStatus,
  type JobWithRefs,
} from '../../lib/jobs';
import { CheckInTab } from './CheckInTab';
import { DiagnosisTab } from './DiagnosisTab';
import { RepairTab } from './RepairTab';
import { WrapUpTab } from './WrapUpTab';

const TABS = [
  { key: 'check-in', label: 'Check-in' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'repair', label: 'Repair' },
  { key: 'wrap-up', label: 'Wrap-up' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function JobDetailPage() {
  const { id } = useParams();
  const q = useJob(id);
  const [params, setParams] = useSearchParams();
  const tab: TabKey = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'check-in';

  if (q.isLoading) return <Spinner />;
  const job = q.data;
  if (!job) return <EmptyState>Job not found.</EmptyState>;

  return (
    <section className="space-y-6">
      <PageTitle
        actions={
          <Link
            to="/admin/jobs"
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            ← All jobs
          </Link>
        }
      >
        <span className="block font-mono text-xs font-normal text-steel">{job.job_number}</span>
        {job.vehicle_label}
      </PageTitle>

      <JobHeader job={job} />

      <div
        role="tablist"
        aria-label="Job stages"
        className="flex gap-1 overflow-x-auto border-b border-[color:var(--color-line)]"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={`whitespace-nowrap px-3 py-2 text-sm font-semibold ${
              tab === t.key
                ? 'border-b-2 border-signal text-[color:var(--color-ink)]'
                : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'check-in' && <CheckInTab job={job} />}
        {tab === 'diagnosis' && <DiagnosisTab job={job} />}
        {tab === 'repair' && <RepairTab job={job} />}
        {tab === 'wrap-up' && <WrapUpTab job={job} />}
      </div>
    </section>
  );
}

function JobHeader({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  return (
    <Card className="grid gap-4 sm:grid-cols-[1fr_1fr_14rem]">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          Client
        </span>
        <p className="text-[color:var(--color-ink)]">
          {job.client_id ? (
            <Link
              to={`/admin/clients/${job.client_id}`}
              className="underline-offset-2 hover:underline"
            >
              {job.client?.name ?? 'Client'}
            </Link>
          ) : (
            'No client on file'
          )}
        </p>
      </div>
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          Registration
        </span>
        <p className="font-mono text-[color:var(--color-ink)]">
          {job.vehicle?.registration ?? '—'}
        </p>
      </div>
      <Labeled label="Status">
        <div className="flex items-center gap-2">
          <Select
            value={job.status}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ status: e.target.value as JobStatus })}
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {jobStatusLabel[s]}
              </option>
            ))}
          </Select>
          <Badge tone={jobStatusTone(job.status)}>{jobStatusLabel[job.status]}</Badge>
        </div>
      </Labeled>
    </Card>
  );
}
