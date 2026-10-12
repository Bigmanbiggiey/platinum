import { useId, useState, type InputHTMLAttributes } from 'react';

/** Password field with a show/hide toggle. */
export function PasswordInput({
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div className="relative">
      <input
        {...rest}
        id={rest.id ?? id}
        type={show ? 'text' : 'password'}
        className={`w-full rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-raised)]/40 px-3 py-2 pr-16 outline-none focus:border-signal ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 px-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
