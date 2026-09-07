import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'accent' | 'outline';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-[color:var(--color-ink)] text-paper hover:opacity-90',
  accent: 'bg-signal text-paper hover:opacity-90',
  outline:
    'border border-[color:var(--color-line)] text-[color:var(--color-ink)] hover:border-signal',
};

/** Internal link button. */
export function ButtonLink({
  to,
  variant = 'primary',
  children,
  className = '',
}: {
  to: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/** External anchor button (tel:, wa.me, etc.). */
export function ButtonAnchor({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: { variant?: Variant; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </a>
  );
}

/** Real <button> (form submits). */
export function Button({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}
