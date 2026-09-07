import type { ReactNode } from 'react';
import { Container } from './Container';

/**
 * Vertical page section with consistent rhythm and an optional eyebrow + heading.
 */
export function Section({
  children,
  eyebrow,
  title,
  intro,
  narrow = false,
  tint = false,
  as: As = 'section',
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  intro?: ReactNode;
  narrow?: boolean;
  tint?: boolean;
  as?: 'section' | 'div';
}) {
  return (
    <As className={`py-14 sm:py-20 ${tint ? 'bg-[color:var(--color-surface)]' : ''}`}>
      <Container narrow={narrow}>
        {(eyebrow || title) && (
          <header className="mb-8 max-w-2xl">
            {eyebrow && (
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-3xl">
                {title}
              </h2>
            )}
            {intro && <div className="mt-4 text-[color:var(--color-muted)]">{intro}</div>}
          </header>
        )}
        {children}
      </Container>
    </As>
  );
}
