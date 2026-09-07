import { Link } from 'react-router-dom';

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
      <svg viewBox="0 0 100 100" className="h-9 w-9 flex-none" fill="none" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="3"
          className="text-[color:var(--color-ink)]"
        />
        <path
          d="M50 6v10M50 84v10M6 50h10M84 50h10"
          stroke="currentColor"
          strokeWidth="3"
          className="text-[color:var(--color-ink)]"
        />
        <path
          d="M50 30 68 64H32Z"
          stroke="currentColor"
          strokeWidth="3"
          className="text-[color:var(--color-ink)]"
        />
        <circle cx="50" cy="30" r="5" className="fill-signal" />
      </svg>
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
