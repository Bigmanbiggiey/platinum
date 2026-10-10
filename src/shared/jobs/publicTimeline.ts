/**
 * The public view of a job (jobs spec §4.5, §6.2) — shared by the public portfolio page
 * and the owner's publish preview so the two can't drift apart.
 *
 * The database view `job_public` is the authority for what goes public; the admin
 * preview builds the same shape from the owner's data with `toPublicTimeline`, applying
 * the same rules: public photos only, part NAMES only, nothing private.
 */
import type { MediaRow } from '../supabase/types';

/** Same shape as a `media` row, so the site's <Img> renders it directly. */
export type PublicPhoto = MediaRow;

export type PublicOutcome = 'pending' | 'fixed' | 'deferred' | 'not_fixed';

export interface PublicFinding {
  title: string;
  diagnosis: string | null;
  fix: string | null;
  outcome: PublicOutcome;
  parts: string[];
  before: PublicPhoto[];
  after: PublicPhoto[];
}

/** One row of the `job_public` view. */
export interface JobPublic {
  job_id: string;
  job_number: string;
  portfolio_slug: string | null;
  vehicle_label: string;
  service_id: string | null;
  service_title: string | null;
  booked_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  complaint: string | null;
  findings: PublicFinding[];
  general_photos: PublicPhoto[];
}

/** Spec §6.2 (owner open item 2): how a deferred problem reads publicly. */
export const DEFERRED_LABEL = 'Recommended — not done at client’s request';

interface SourceJob {
  id: string;
  job_number: string;
  vehicle_label: string;
  service_id: string | null;
  booked_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  complaint: string | null;
}
interface SourceFinding {
  id: string;
  title: string;
  diagnosis: string | null;
  fix: string | null;
  outcome: PublicOutcome;
  display_order: number;
  created_at: string;
}
interface SourcePart {
  finding_id: string | null;
  name: string;
  created_at: string;
}
interface SourcePhoto {
  media_id: string;
  finding_id: string | null;
  stage: 'check_in' | 'diagnosis' | 'repair';
  caption: string | null;
  is_public: boolean;
  display_order: number;
  created_at: string;
  media: {
    storage_path: string;
    alt_text: string;
    width?: number | null;
    height?: number | null;
    variants?: number[] | null;
  } | null;
}

const byOrder = <T extends { display_order: number; created_at: string }>(a: T, b: T) =>
  a.display_order - b.display_order || a.created_at.localeCompare(b.created_at);

function toPhoto(p: SourcePhoto): PublicPhoto {
  return {
    id: p.media_id,
    storage_path: p.media!.storage_path,
    alt_text: p.media!.alt_text,
    caption: p.caption,
    width: p.media!.width ?? null,
    height: p.media!.height ?? null,
    variants: p.media!.variants ?? [],
  };
}

/** The owner's preview — the same rules as the `job_public` view. */
export function toPublicTimeline(
  job: SourceJob,
  findings: SourceFinding[],
  parts: SourcePart[],
  photos: SourcePhoto[],
  opts: { serviceTitle?: string | null; slug?: string | null } = {},
): JobPublic {
  const shown = photos.filter((p) => p.is_public && p.media).sort(byOrder);
  const photosFor = (findingId: string, stage: SourcePhoto['stage']) =>
    shown.filter((p) => p.finding_id === findingId && p.stage === stage).map(toPhoto);
  return {
    job_id: job.id,
    job_number: job.job_number,
    portfolio_slug: opts.slug ?? null,
    vehicle_label: job.vehicle_label,
    service_id: job.service_id,
    service_title: opts.serviceTitle ?? null,
    booked_at: job.booked_at,
    checked_in_at: job.checked_in_at,
    completed_at: job.completed_at,
    complaint: job.complaint,
    findings: [...findings].sort(byOrder).map((f) => ({
      title: f.title,
      diagnosis: f.diagnosis,
      fix: f.fix,
      outcome: f.outcome,
      parts: parts
        .filter((p) => p.finding_id === f.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((p) => p.name),
      before: photosFor(f.id, 'diagnosis'),
      after: photosFor(f.id, 'repair'),
    })),
    general_photos: shown
      .filter((p) => p.stage === 'check_in' || p.finding_id === null)
      .map(toPhoto),
  };
}

const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** `2014-toyota-fielder-brake-overhaul-0042` — unique because it ends in the job number. */
export function jobSlug(j: {
  vehicle_label: string;
  service_title?: string | null;
  job_number: string;
}): string {
  const digits = j.job_number.replace(/\D/g, '').slice(-4) || j.job_number;
  return [slugify(j.vehicle_label), j.service_title ? slugify(j.service_title) : '', digits]
    .filter(Boolean)
    .join('-');
}
