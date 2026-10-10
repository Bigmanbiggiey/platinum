import type { ReactNode } from 'react';
import { Img } from './ui/Img';
import { publicImageUrl } from '../../shared/content/media';
import { DATUM_TEXT_CLASS } from './ui/TitleStrip';
import {
  DEFERRED_LABEL,
  type JobPublic,
  type PublicFinding,
  type PublicPhoto,
} from '../../shared/jobs/publicTimeline';

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Nairobi',
      })
    : null;

const OUTCOME: Record<PublicFinding['outcome'], string | null> = {
  fixed: 'Fixed',
  not_fixed: 'Not fixed',
  deferred: DEFERRED_LABEL,
  pending: null,
};

function Step({
  label,
  when,
  done = false,
  children,
}: {
  label: string;
  when?: string | null;
  done?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="relative border-l border-[color:var(--color-line)] pb-10 pl-6 last:pb-0">
      <span
        aria-hidden="true"
        className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${
          done ? 'bg-signal' : 'bg-[color:var(--color-ink)]'
        }`}
      />
      <h2 className="text-xl font-bold text-[color:var(--color-ink)]">{label}</h2>
      {when && <p className={`mt-1 ${DATUM_TEXT_CLASS}`}>{when}</p>}
      {children && <div className="mt-4 space-y-6">{children}</div>}
    </li>
  );
}

function Photos({ photos, label }: { photos: PublicPhoto[]; label: string }) {
  if (photos.length === 0) return null;
  return (
    <figure>
      <figcaption className={DATUM_TEXT_CLASS}>{label}</figcaption>
      <div className="mt-2 grid gap-3">
        {photos.map((p) => (
          <a
            key={p.id}
            href={publicImageUrl(p.storage_path) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-structural"
          >
            <Img
              media={p}
              className="w-full object-cover"
              sizes="(min-width: 768px) 320px, 100vw"
            />
            {p.caption && (
              <span className="mt-1 block text-sm text-[color:var(--color-muted)]">
                {p.caption}
              </span>
            )}
          </a>
        ))}
      </div>
    </figure>
  );
}

/**
 * A documented job, step by step (jobs spec §6.2): checked in → diagnosis → repair →
 * completed. Renders only what `job_public` exposes — never client data, the plate,
 * odometer, labour, costs or part quantities.
 */
export function JobTimeline({ job }: { job: JobPublic }) {
  const diagnosed = job.findings.filter((f) => f.diagnosis || f.before.length > 0);
  return (
    <ol className="mt-2">
      <Step label="Checked in" when={date(job.booked_at ?? job.checked_in_at)}>
        {job.complaint && (
          <p className="text-lg text-[color:var(--color-ink)]">
            <span className="font-semibold">The customer told us:</span> “{job.complaint}”
          </p>
        )}
        <Photos photos={job.general_photos} label="On arrival" />
      </Step>

      {diagnosed.length > 0 && (
        <Step label="Diagnosis">
          {diagnosed.map((f, i) => (
            <div key={i}>
              <h3 className="font-semibold text-[color:var(--color-ink)]">{f.title}</h3>
              {f.diagnosis && <p className="mt-1 text-[color:var(--color-muted)]">{f.diagnosis}</p>}
              {/* With after photos, the before ones sit beside them under Repair. */}
              {f.after.length === 0 && (
                <div className="mt-3 max-w-md">
                  <Photos photos={f.before} label="Before" />
                </div>
              )}
            </div>
          ))}
        </Step>
      )}

      {job.findings.length > 0 && (
        <Step label="Repair">
          {job.findings.map((f, i) => (
            <div key={i}>
              <h3 className="font-semibold text-[color:var(--color-ink)]">{f.title}</h3>
              {OUTCOME[f.outcome] && (
                <p
                  className={`mt-1 text-sm font-semibold ${
                    f.outcome === 'fixed' ? 'text-teal' : 'text-[color:var(--color-muted)]'
                  }`}
                >
                  {OUTCOME[f.outcome]}
                </p>
              )}
              {f.fix && <p className="mt-1 text-[color:var(--color-muted)]">{f.fix}</p>}
              {f.parts.length > 0 && (
                <p className="mt-2 text-sm text-[color:var(--color-ink)]">
                  <span className={DATUM_TEXT_CLASS}>Parts</span> {f.parts.join(' · ')}
                </p>
              )}
              {f.after.length > 0 && (
                <div
                  className={`mt-3 grid gap-4 ${f.before.length > 0 ? 'sm:grid-cols-2' : 'max-w-md'}`}
                >
                  <Photos photos={f.before} label="Before" />
                  <Photos photos={f.after} label="After" />
                </div>
              )}
            </div>
          ))}
        </Step>
      )}

      <Step label="Completed" when={date(job.completed_at)} done />
    </ol>
  );
}
