/**
 * Jobs (work orders) — row types + pure helpers.
 * Spec: docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md
 */
import type { ServiceRequest } from './db';

export const JOB_STATUSES = [
  'checked_in',
  'diagnosing',
  'in_repair',
  'completed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const OPEN_STATUSES: readonly JobStatus[] = ['checked_in', 'diagnosing', 'in_repair'];

export const FINDING_OUTCOMES = ['pending', 'fixed', 'deferred', 'not_fixed'] as const;
export type FindingOutcome = (typeof FINDING_OUTCOMES)[number];

export type PhotoStage = 'check_in' | 'diagnosis' | 'repair';

export interface Job {
  id: string;
  job_number: string;
  client_id: string | null;
  vehicle_id: string | null;
  vehicle_label: string;
  service_request_id: string | null;
  service_id: string | null;
  status: JobStatus;
  booked_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  odometer_km: number | null;
  complaint: string | null;
  public_consent: boolean;
  consent_recorded_at: string | null;
  labour_hours: number | null;
  labour_cost_kes: number | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A job with the bits of its client + vehicle the admin lists need. */
export interface JobWithRefs extends Job {
  client: { name: string } | null;
  vehicle: { registration: string | null } | null;
}

export interface JobFinding {
  id: string;
  job_id: string;
  display_order: number;
  title: string;
  diagnosis: string | null;
  fix: string | null;
  outcome: FindingOutcome;
  created_at: string;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  finding_id: string | null;
  media_id: string;
  stage: PhotoStage;
  caption: string | null;
  is_public: boolean;
  display_order: number;
  created_at: string;
  media: { storage_path: string; alt_text: string } | null;
}

export interface JobPart {
  id: string;
  job_id: string;
  finding_id: string | null;
  name: string;
  /** Private — never shown publicly. */
  quantity: number;
  /** Private — the cost of this line, not a unit price. */
  cost_kes: number | null;
  created_at: string;
}

export const jobStatusLabel: Record<JobStatus, string> = {
  checked_in: 'Checked in',
  diagnosing: 'Diagnosing',
  in_repair: 'In repair',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const outcomeLabel: Record<FindingOutcome, string> = {
  pending: 'Pending',
  fixed: 'Fixed',
  deferred: 'Deferred — client chose not to fix now',
  not_fixed: 'Not fixed',
};

const stageLabel: Record<PhotoStage, string> = {
  check_in: 'Check-in',
  diagnosis: 'Before repair',
  repair: 'After repair',
};

export function jobStatusTone(s: JobStatus): 'neutral' | 'attention' | 'pass' | 'muted' {
  if (s === 'completed') return 'pass';
  if (s === 'cancelled') return 'muted';
  if (s === 'checked_in') return 'attention';
  return 'neutral';
}

/** "2014 Toyota Fielder" — never includes the registration (it's private). */
export function vehicleLabel(v: {
  make: string;
  model?: string | null;
  year?: number | null;
}): string {
  return [v.year, v.make, v.model]
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
    .map((p) => String(p).trim())
    .join(' ');
}

export type JobListFilter = 'open' | 'completed' | 'cancelled' | 'all';

export function matchesJobFilter(job: Pick<Job, 'status'>, filter: JobListFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'open') return OPEN_STATUSES.includes(job.status);
  return job.status === filter;
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function matchesJobSearch(
  job: Pick<JobWithRefs, 'job_number' | 'vehicle_label' | 'client' | 'vehicle'>,
  term: string,
): boolean {
  const t = squash(term);
  if (!t) return true;
  return [
    job.job_number,
    job.vehicle_label,
    job.client?.name ?? '',
    job.vehicle?.registration ?? '',
  ]
    .map(squash)
    .some((field) => field.includes(t));
}

/** Alt text for an uploaded job photo (the media library requires one). */
export function photoAlt(vehicle: string, stage: PhotoStage, findingTitle?: string | null): string {
  return [vehicle, stageLabel[stage], findingTitle].filter(Boolean).join(' — ');
}

export function jobCostSummary(labourCostKes: number | null, parts: Pick<JobPart, 'cost_kes'>[]) {
  const labour = labourCostKes ?? 0;
  const partsTotal = parts.reduce((sum, p) => sum + (p.cost_kes ?? 0), 0);
  return { labour, parts: partsTotal, total: labour + partsTotal };
}

export const formatKes = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

export function pendingFindingsCount(findings: Pick<JobFinding, 'outcome'>[]): number {
  return findings.filter((f) => f.outcome === 'pending').length;
}

/** ISO timestamp → `YYYY-MM-DD` for `<input type="date">`, in Kenyan time. */
export function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
}

/** `YYYY-MM-DD` → start of that day in Kenyan time (UTC+3, no DST). */
export function fromDateInput(date: string): string | null {
  return date ? `${date}T00:00:00+03:00` : null;
}

export function jobPrefillFromRequest(
  req: Pick<ServiceRequest, 'id' | 'client_id' | 'vehicle_id' | 'requested_date' | 'message'>,
): Partial<Job> {
  return {
    service_request_id: req.id,
    client_id: req.client_id,
    vehicle_id: req.vehicle_id,
    booked_at: fromDateInput(req.requested_date ?? ''),
    complaint: req.message?.trim() || null,
  };
}

export interface VehicleJobGroup<T> {
  key: string;
  label: string;
  jobs: T[];
}

/** Per-vehicle service history: groups in first-seen order (input is newest first). */
export function groupJobsByVehicle<T extends Pick<Job, 'vehicle_id' | 'vehicle_label'>>(
  jobs: T[],
): VehicleJobGroup<T>[] {
  const groups = new Map<string, VehicleJobGroup<T>>();
  for (const job of jobs) {
    const key = job.vehicle_id ?? 'none';
    const group = groups.get(key) ?? {
      key,
      label: job.vehicle_id ? job.vehicle_label : 'Vehicle removed',
      jobs: [],
    };
    group.jobs.push(job);
    groups.set(key, group);
  }
  return [...groups.values()];
}
