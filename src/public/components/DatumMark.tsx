/**
 * The crosshair + amber-node datum mark — Platinum Point's recurring motif (a fixed
 * point of competence that comes to wherever the vehicle is). Shared by `Wordmark`
 * (small, static) and the Home hero (large, optionally animated) so the mark's paths
 * live in exactly one place. See docs/design-refresh-plan.md §2, §6.
 *
 * `animate` opts into the one-shot "draw in + settle" motion defined in
 * src/index.css (gated on prefers-reduced-motion there, not here) — Wordmark never
 * sets it.
 */
const SIZE_CLASS = {
  sm: 'h-9 w-9',
  md: 'h-14 w-14',
  lg: 'h-56 w-56',
} as const;

export function DatumMark({
  size = 'md',
  animate = false,
  className = '',
}: {
  size?: keyof typeof SIZE_CLASS;
  animate?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`datum-mark flex-none ${SIZE_CLASS[size]} ${className}`}
      fill="none"
      aria-hidden="true"
      data-animate={animate}
    >
      <circle
        cx="50"
        cy="50"
        r="40"
        stroke="currentColor"
        strokeWidth="3"
        className="datum-mark-ring text-[color:var(--color-ink)]"
        style={{ ['--dm-len' as string]: 252 }}
      />
      <path
        d="M50 6v10M50 84v10M6 50h10M84 50h10"
        stroke="currentColor"
        strokeWidth="3"
        className="datum-mark-crosshair text-[color:var(--color-ink)]"
        style={{ ['--dm-len' as string]: 42 }}
      />
      <path
        d="M50 30 68 64H32Z"
        stroke="currentColor"
        strokeWidth="3"
        className="datum-mark-crosshair text-[color:var(--color-ink)]"
        style={{ ['--dm-len' as string]: 114 }}
      />
      <circle cx="50" cy="30" r="5" className="datum-mark-node fill-signal" />
    </svg>
  );
}
