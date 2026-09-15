import type { ReactNode } from 'react';
import { Container } from './Container';
import { TitleStrip, type DatumStripProps } from './TitleStrip';

/**
 * Vertical page section with consistent rhythm and an optional heading. Pass `datum`
 * only where the section's content is a genuine countable record (see TitleStrip) —
 * most sections should pass just `title`.
 */
export function Section({
  children,
  title,
  intro,
  datum,
  narrow = false,
  tint = false,
  as: As = 'section',
  id,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  intro?: ReactNode;
  datum?: DatumStripProps;
  narrow?: boolean;
  tint?: boolean;
  as?: 'section' | 'div';
  id?: string;
  className?: string;
}) {
  return (
    <As
      id={id}
      className={`py-14 sm:py-20 ${tint ? 'bg-[color:var(--color-surface)]' : ''} ${className}`}
    >
      <Container narrow={narrow}>
        <TitleStrip title={title} intro={intro} datum={datum} />
        {children}
      </Container>
    </As>
  );
}
