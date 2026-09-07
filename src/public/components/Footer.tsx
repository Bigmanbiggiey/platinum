import { Link } from 'react-router-dom';
import { BUSINESS } from '../../shared/business';

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
          <p className="mt-3 text-sm">
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
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link to="/services">Services</Link>
            </li>
            <li>
              <Link to="/portfolio">Work</Link>
            </li>
            <li>
              <Link to="/service-areas">Service areas</Link>
            </li>
            <li>
              <Link to="/book">Book a service</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy policy</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--color-line)]">
        <div className="mx-auto max-w-5xl px-5 py-5 text-xs text-[color:var(--color-muted)]">
          Serving {BUSINESS.serviceAreaSummary}. © {year} {BUSINESS.name}.
        </div>
      </div>
    </footer>
  );
}
