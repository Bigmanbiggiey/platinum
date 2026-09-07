import { Link } from 'react-router-dom';

/**
 * Rev 01 datum mark (docs/product-definition.md §10.2). Amber apex node.
 * `color` controls the ring/tick/triangle colour; the node is always Signal Amber.
 */
export function DatumMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="0.75" strokeOpacity=".35" />
      <path d="M50 0v14M50 86v14M0 50h14M86 50h14" stroke="currentColor" strokeWidth="2.5" />
      <path d="M50 27 72 67H28Z" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="27" r="5.5" className="fill-signal" />
    </svg>
  );
}

/** Admin wordmark lockup — links to the admin home. */
export function AdminBrand({ to = '/admin' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3" aria-label="Platinum Point — admin home">
      <span className="text-[color:var(--color-ink)]">
        <DatumMark className="h-8 w-8" />
      </span>
      <span className="leading-none">
        <span className="block text-base font-bold tracking-tight text-[color:var(--color-ink)]">
          Platinum Point
        </span>
        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          Automotive Engineering · Admin
        </span>
      </span>
    </Link>
  );
}
