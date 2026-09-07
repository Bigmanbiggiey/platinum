import type {
  ReactNode,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';

const controlClass =
  'mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[color:var(--color-ink)] outline-none focus:border-signal';

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-[color:var(--color-ink)]"
      >
        {label}
        {required && <span className="text-signal"> *</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">{hint}</p>}
      {children}
      {error && (
        <p className="mt-1 text-xs text-signal" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${controlClass} ${props.className ?? ''}`}
      rows={props.rows ?? 4}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

/** Visually-hidden honeypot field. Bots fill it; humans never see it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
    >
      <label htmlFor="company_website">Company website</label>
      <input
        id="company_website"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
