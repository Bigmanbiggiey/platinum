import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, PageTitle, Spinner } from '../../components/ui';
import { useJob, useUpdateJob } from '../../lib/jobData';
import { nextStep, statusOnEnter, STEPS, type StepKey } from '../../lib/jobFlow';
import type { JobWithRefs } from '../../lib/jobs';
import { ActivityTab } from './ActivityTab';
import { CheckInTab } from './CheckInTab';
import { DiagnosisTab } from './DiagnosisTab';
import { JobHeader } from './JobHeader';
import { RepairTab } from './RepairTab';
import { StepNav } from './StepNav';
import { WrapUpTab } from './WrapUpTab';
import { StepFlowContext, UNSAVED_PROMPT, type StepFlow } from './stepFlow';
import { BackLink } from '../../../shared/lib/BackLink';

const TABS = [...STEPS, { key: 'activity', label: 'Activity' }] as const;
type TabKey = (typeof TABS)[number]['key'];

const AUTO_KEY = 'admin.jobs.autoAdvance';

function readAutoAdvance() {
  try {
    return localStorage.getItem(AUTO_KEY) !== '0';
  } catch {
    return true;
  }
}

export function JobDetailPage() {
  const { id } = useParams();
  const q = useJob(id);
  const [params] = useSearchParams();
  const tab: TabKey = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'check-in';

  if (q.isLoading) return <Spinner />;
  const job = q.data;
  if (!job) return <EmptyState>Job not found.</EmptyState>;

  return (
    <StepFlowProvider job={job} tab={tab}>
      {(flow, note, error) => (
        <section className="space-y-6">
          <PageTitle
            actions={
              <BackLink
                to="/admin/jobs"
                className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
              >
                ← All jobs
              </BackLink>
            }
          >
            <span className="block font-mono text-xs font-normal text-[color:var(--color-muted)]">
              {job.job_number}
            </span>
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
                onClick={() => flow.goTo(t.key)}
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
            {tab === 'activity' && <ActivityTab job={job} />}
          </div>

          {tab !== 'activity' && <StepNav step={tab} note={note} error={error} />}
        </section>
      )}
    </StepFlowProvider>
  );
}

/**
 * Owns the step flow for one job: guarded tab changes, finishing a step (status forward,
 * then the next step when auto-advance is on) and the per-device auto-advance switch.
 */
function StepFlowProvider({
  job,
  tab,
  children,
}: {
  job: JobWithRefs;
  tab: TabKey;
  children: (flow: StepFlow, note: string | null, error: string | null) => ReactNode;
}) {
  const [, setParams] = useSearchParams();
  const update = useUpdateJob(job.id);
  const unsaved = useRef(new Map<string, boolean>());
  const [autoAdvance, setAuto] = useState(readAutoAdvance);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const markUnsaved = useCallback((key: string, on: boolean) => {
    if (on) unsaved.current.set(key, true);
    else unsaved.current.delete(key);
  }, []);

  const hasUnsaved = (ignore: string[] = []) =>
    [...unsaved.current.keys()].some((k) => !ignore.includes(k));

  const move = (to: string) => {
    setNote(null);
    setError(null);
    setParams({ tab: to }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const goTo = (to: string) => {
    if (to === tab) return true;
    if (hasUnsaved() && !confirm(UNSAVED_PROMPT)) return false;
    move(to);
    return true;
  };

  const finish = async (step: StepKey, opts: { saved?: string[] } = {}) => {
    const next = nextStep(step);
    if (!next) return false;
    if (autoAdvance && hasUnsaved(opts.saved) && !confirm(UNSAVED_PROMPT)) return false;
    setError(null);
    const status = statusOnEnter(next.key, job.status);
    if (status) {
      try {
        await update.mutateAsync({ status });
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    }
    const label = STEPS.find((s) => s.key === step)!.label;
    if (autoAdvance) move(next.key);
    else setNote(`${label} done. Use “${next.label} ›” below when you're ready.`);
    return true;
  };

  const setAutoAdvance = (on: boolean) => {
    setAuto(on);
    try {
      localStorage.setItem(AUTO_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  // Rebuilt each render on purpose so goTo/finish see the latest tab and status;
  // cards only depend on markUnsaved, which is stable.
  const flow: StepFlow = {
    goTo,
    finish,
    finishing: update.isPending,
    autoAdvance,
    setAutoAdvance,
    markUnsaved,
  };

  return (
    <StepFlowContext.Provider value={flow}>{children(flow, note, error)}</StepFlowContext.Provider>
  );
}
