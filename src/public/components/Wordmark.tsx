import { Link } from 'react-router-dom';
import { DatumMark } from './DatumMark';

/**
 * Interim wordmark lockup, set live from the Rev 01 type stack
 * (Archivo + IBM Plex Mono descriptor). Replaced by the supplied `ppae-lockup-*.svg`
 * master once it lands — see docs/product-definition.md §10.2 / §10.4.
 */
export function Wordmark() {
  return (
    // Named by its visible text (plus a hidden "home") rather than an aria-label, so voice
    // users can say what they see (WCAG 2.5.3, Label in Name).
    <Link to="/" className="group flex items-center gap-3">
      <DatumMark size="sm" />
      <span className="leading-none">
        <span className="block text-lg font-bold tracking-tight text-[color:var(--color-ink)]">
          Platinum
        </span>{' '}
        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
          Motor Services
        </span>
        <span className="sr-only"> — home</span>
      </span>
    </Link>
  );
}
