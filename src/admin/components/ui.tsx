import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/* -------------------------------------------------------------------------- */
/*  Admin UI kit — Rev 01 brand tokens (docs/product-definition.md §10.2).    */
/*  The admin runs data-theme="dark": --color-ink = Paper, ground = Graphite. */
/*  IBM Plex Mono (`font-mono`) for labels / IDs / dates / phone numbers.     */
/* -------------------------------------------------------------------------- */

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)]">
        {children}
      </h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
      {children}
    </span>
  );
}

type BtnVariant = 'primary' | 'accent' | 'ghost' | 'danger';
const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-opacity disabled:opacity-50 disabled:pointer-events-none';
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-[color:var(--color-ink)] text-[color:var(--color-ground)] hover:opacity-90',
  accent: 'bg-signal text-paper hover:opacity-90',
  ghost:
    'border border-[color:var(--color-line)] text-[color:var(--color-ink)] hover:border-signal',
  danger: 'border border-signal/50 text-signal hover:bg-signal/10',
};

export function Button({
  variant = 'ghost',
  className = '',
  children,
  ...rest
}: { variant?: BtnVariant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`${btnBase} ${btnVariants[variant]} ${className}`}>
      {children}
    </button>
  );
}

const field =
  'mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-ground)] px-3 py-2 text-sm text-[color:var(--color-ink)] outline-none focus:border-signal';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${field} ${props.className ?? ''}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea rows={props.rows ?? 3} {...props} className={`${field} ${props.className ?? ''}`} />
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${field} ${props.className ?? ''}`} />;
}

export function Labeled({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      {children}
      {hint && <span className="mt-1 block text-xs text-[color:var(--color-muted)]">{hint}</span>}
    </label>
  );
}

/** Status pill. `tone` maps to the brand roles: teal = pass/done, amber = attention. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'attention' | 'pass' | 'muted';
}) {
  const tones = {
    neutral: 'bg-slate text-platinum',
    attention: 'bg-signal/15 text-signal',
    pass: 'bg-teal/15 text-teal',
    muted: 'bg-slate/50 text-steel',
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-line)] p-8 text-center text-sm text-[color:var(--color-muted)]">
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-[color:var(--color-muted)]">{label}</p>;
}
