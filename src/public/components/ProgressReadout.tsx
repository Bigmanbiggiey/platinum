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
 * Shown from 1024 px as a solid chip, so page headings never run underneath it (at
 * 768–1023 px the text overlapped them). Below 768 px the MobileContactBar owns the
 * bottom edge.
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
      className={`fixed bottom-6 right-5 z-30 hidden rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-ground)] px-3 py-1.5 lg:block ${DATUM_TEXT_CLASS}`}
    >
      {`01 / ${String(sections.length).padStart(2, '0')} · ${sections[0].label}`}
    </p>
  );
}
