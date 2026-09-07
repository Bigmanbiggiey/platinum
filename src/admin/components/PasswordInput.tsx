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
        className={`w-full rounded-md border border-slate bg-slate/40 px-3 py-2 pr-16 outline-none focus:border-signal ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 px-3 font-mono text-[10px] uppercase tracking-widest text-platinum hover:text-paper"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
