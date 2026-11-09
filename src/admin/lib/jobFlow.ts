/**
 * The job page's step-by-step flow: Check-in → Diagnosis → Repair → Wrap-up.
 * Activity is a log, not a step, so it sits outside the order.
 */
import { STAFF_WORKING_STATUSES, type JobFinding, type JobStatus } from './jobs';

export const STEPS = [
  { key: 'check-in', label: 'Check-in' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'repair', label: 'Repair' },
  { key: 'wrap-up', label: 'Wrap-up' },
] as const;
export type StepKey = (typeof STEPS)[number]['key'];

export const isStep = (key: string): key is StepKey => STEPS.some((s) => s.key === key);

export const stepIndex = (key: StepKey) => STEPS.findIndex((s) => s.key === key);

export function nextStep(key: StepKey) {
  return STEPS[stepIndex(key) + 1];
}

export function prevStep(key: StepKey) {
  const i = stepIndex(key);
  return i > 0 ? STEPS[i - 1] : undefined;
}

/** The status a job takes on when a step is finished and the next one begins. */
const STATUS_FOR_STEP: Partial<Record<StepKey, JobStatus>> = {
  diagnosis: 'diagnosing',
  repair: 'in_repair',
};

/**
 * Status to set on entering `step`, or null to leave it. Only ever moves forward, and
 * never touches a job that is awaiting review, completed or cancelled.
 */
export function statusOnEnter(step: StepKey, current: JobStatus): JobStatus | null {
  const target = STATUS_FOR_STEP[step];
  if (!target || !STAFF_WORKING_STATUSES.includes(current)) return null;
  const rank = (s: JobStatus) => STAFF_WORKING_STATUSES.indexOf(s);
  return rank(current) < rank(target) ? target : null;
}

/** Repair is finished once every problem has an outcome other than Pending. */
export function repairComplete(findings: Pick<JobFinding, 'outcome'>[]): boolean {
  return findings.length > 0 && findings.every((f) => f.outcome !== 'pending');
}

/** How long the "Repair done" banner waits before moving on to Wrap-up. */
export const AUTO_ADVANCE_MS = 3000;
