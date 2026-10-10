/**
 * Job activity (who did what) — row types + pure formatting.
 * Spec: docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md §4.6, §5.
 */
import { jobStatusLabel, type JobStatus, type PhotoStage } from './jobs';

export const ACTIVITY_ACTIONS = [
  'checked_in',
  'status_changed',
  'finding_added',
  'finding_updated',
  'photo_added',
  'photo_removed',
  'part_added',
  'part_removed',
  'labour_updated',
  'consent_changed',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface JobActivity {
  id: string;
  job_id: string;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: 'owner' | 'staff' | null;
  action: ActivityAction;
  detail: Record<string, unknown>;
}

export interface JobActivityWithJob extends JobActivity {
  job: { job_number: string; vehicle_label: string } | null;
}

const PHOTO_WORD: Record<PhotoStage, string> = {
  check_in: 'check-in',
  diagnosis: 'before',
  repair: 'after',
};

const OUTCOME_WORD: Record<string, string> = {
  fixed: 'fixed',
  deferred: 'deferred',
  not_fixed: 'not fixed',
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

/** "added 2 after photos", "moved the job from Checked in to Diagnosing", … */
export function describeActivity(a: Pick<JobActivity, 'action' | 'detail'>): string {
  const d = a.detail ?? {};
  switch (a.action) {
    case 'checked_in':
      return 'checked in the vehicle';
    case 'status_changed': {
      const to = jobStatusLabel[d.to as JobStatus] ?? str(d.to);
      const from = jobStatusLabel[d.from as JobStatus];
      return from ? `moved the job from ${from} to ${to}` : `moved the job to ${to}`;
    }
    case 'finding_added':
      return `added problem “${str(d.title)}”`;
    case 'finding_updated': {
      const outcome = OUTCOME_WORD[str(d.outcome)];
      return `updated problem “${str(d.title)}”${outcome ? ` — ${outcome}` : ''}`;
    }
    case 'photo_added': {
      const n = num(d.count) ?? 1;
      const word = PHOTO_WORD[d.stage as PhotoStage];
      return `added ${n} ${word ? `${word} ` : ''}photo${n === 1 ? '' : 's'}`;
    }
    case 'photo_removed': {
      const word = PHOTO_WORD[d.stage as PhotoStage];
      if (!word) return 'removed a photo';
      return `removed ${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word} photo`;
    }
    case 'part_added': {
      const q = num(d.quantity);
      return `added part ${str(d.name)}${q !== null ? ` ×${q}` : ''}`;
    }
    case 'part_removed':
      return `removed part ${str(d.name)}`;
    case 'labour_updated': {
      const hours = num(d.to);
      return hours === null ? 'cleared the labour hours' : `set labour to ${hours} h`;
    }
    case 'consent_changed':
      return d.to === true
        ? 'recorded the customer’s consent to publish'
        : 'withdrew consent to publish';
  }
}

/** "Kevin · staff"; "System" for entries written with nobody signed in. */
export function actorLabel(a: Pick<JobActivity, 'actor_name' | 'actor_role'>): string {
  if (!a.actor_name) return 'System';
  return a.actor_role ? `${a.actor_name} · ${a.actor_role}` : a.actor_name;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString('en-KE', {
    dateStyle: 'medium',
    timeZone: 'Africa/Nairobi',
  });
}
