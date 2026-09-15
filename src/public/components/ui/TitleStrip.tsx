import type { ReactNode } from 'react';
import { CountUpNumeral } from './CountUpNumeral';

/**
 * Shared section-header block. Replaces the old decorative "eyebrow" label that used
 * to sit above every heading regardless of whether there was anything to say (see
 * docs/design-refresh-plan.md §3, §6). A `datum` line only appears where the content
 * is genuinely a countable record (e.g. "04 SERVICES · KITENGELA") — everywhere else
 * this renders as a plain heading. Both variants share identical spacing/scale so the
 * difference reads as deliberate restraint, not an inconsistent build.
 */
export interface DatumStripProps {
  /** Real count — e.g. `services.length`. Rendered zero-padded (04). */
  count: number;
  /** e.g. "SERVICES" */
  label: string;
  /** Optional trailing segment after " · ", e.g. an area name. */
  meta?: string;
  /** Opt-in: count up from 0 on scroll-into-view instead of a static number. */
  animate?: boolean;
}

/** The mono/tracked-caps treatment reserved for real data (counts, breadcrumbs). */
export const DATUM_TEXT_CLASS =
  'font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--color-muted)]';

export function TitleStrip({
  title,
  intro,
  datum,
}: {
  title?: string;
  intro?: ReactNode;
  datum?: DatumStripProps;
}) {
  if (!title && !datum) return null;
  return (
    <header className="mb-8 max-w-2xl">
      {datum && (
        <p className={DATUM_TEXT_CLASS}>
          {datum.animate ? <CountUpNumeral count={datum.count} /> : String(datum.count).padStart(2, '0')}{' '}
          {datum.label}
          {datum.meta ? ` · ${datum.meta}` : ''}
        </p>
      )}
      {title && (
        <h2
          className={`${datum ? 'mt-3 ' : ''}text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-3xl`}
        >
          {title}
        </h2>
      )}
      {intro && <div className="mt-4 text-[color:var(--color-muted)]">{intro}</div>}
    </header>
  );
}
