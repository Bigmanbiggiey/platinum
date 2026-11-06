import { Link } from 'react-router-dom';
import { BUSINESS } from '../../shared/business';
import { navFor } from '../nav';

/**
 * Footer NAP + links. Uses the `BUSINESS` constants, which mirror the `site_settings`
 * seed row until the Phase 3 admin makes them editable.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-[color:var(--color-ink)]">{BUSINESS.name}</p>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">{BUSINESS.baseAreaDetail}</p>
          <p className="mt-3 text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center md:[&_a]:min-h-0">
            <a href={`tel:${BUSINESS.phoneE164}`} className="font-semibold">
              {BUSINESS.phoneDisplay}
            </a>
            <br />
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
          </p>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            Hours
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-muted)]">
            {BUSINESS.hours.map((h) => (
              <li key={h.days}>
                <span className="text-[color:var(--color-ink)]">{h.days}</span> · {h.label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            Site
          </p>
          <ul className="mt-2 space-y-1 text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center md:[&_a]:min-h-0">
            {navFor('footer').map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.longLabel ?? l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--color-line)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs text-[color:var(--color-muted)]">
          <p>
            Serving {BUSINESS.serviceAreaSummary}. © {year} {BUSINESS.name}.
          </p>
        </div>
      </div>
    </footer>
  );
}
