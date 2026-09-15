import { useEffect, useRef } from 'react';
import { DATUM_TEXT_CLASS } from './ui/TitleStrip';
import { loadScrollTrigger, prefersReducedMotion } from '../../shared/lib/scrollFx';

export interface ProgressSection {
  id: string;
  label: string;
}

/**
 * Home-scoped fixed instrument readout — a trip-computer-style line that ticks as the
 * visitor scrolls through Home's sections. Static/SSG/no-JS/reduced-motion state
 * shows section 1's real label (a genuine resting state, not a placeholder).
 * `hidden md:block` deliberately matches MobileContactBar's `md:hidden` breakpoint
 * exactly, so the two fixed bottom elements never appear together.
 */
export function ProgressReadout({ sections }: { sections: ProgressSection[] }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || sections.length === 0) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    loadScrollTrigger().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const total = sections.length;
        sections.forEach((s, i) => {
          const el = document.getElementById(s.id);
          if (!el) return;
          ScrollTrigger.create({
            trigger: el,
            start: 'top center',
            end: 'bottom center',
            onToggle: (self) => {
              if (self.isActive && ref.current) {
                ref.current.textContent = `${String(i + 1).padStart(2, '0')} / ${String(
                  total,
                ).padStart(2, '0')} · ${s.label}`;
              }
            },
          });
        });
      });
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <p
      ref={ref}
      aria-hidden="true"
      className={`fixed bottom-6 right-5 z-30 hidden md:block ${DATUM_TEXT_CLASS}`}
    >
      {`01 / ${String(sections.length).padStart(2, '0')} · ${sections[0].label}`}
    </p>
  );
}
