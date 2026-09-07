import type { ReactNode } from 'react';

/** Centered content column. `narrow` for reading-width pages (About, Privacy). */
export function Container({
  children,
  narrow = false,
  className = '',
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full px-5 ${narrow ? 'max-w-2xl' : 'max-w-5xl'} ${className}`}>
      {children}
    </div>
  );
}
