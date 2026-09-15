import { Link } from 'react-router-dom';
import { DatumMark } from './DatumMark';

/**
 * Interim wordmark lockup, set live from the Rev 01 type stack
 * (Archivo + IBM Plex Mono descriptor). Replaced by the supplied `ppae-lockup-*.svg`
 * master once it lands — see docs/product-definition.md §10.2 / §10.4.
 */
export function Wordmark() {
  return (
    <Link
      to="/"
      className="group flex items-center gap-3"
      aria-label="Platinum Point Automotive Engineering — home"
    >
      <DatumMark size="sm" />
      <span className="leading-none">
        <span className="block text-lg font-bold tracking-tight text-[color:var(--color-ink)]">
          Platinum Point
        </span>
        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
          Automotive Engineering
        </span>
      </span>
    </Link>
  );
}
