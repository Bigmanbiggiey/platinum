import { useEffect, useRef } from 'react';
import { loadScrollTrigger, prefersReducedMotion } from '../../../shared/lib/scrollFx';

/**
 * Opt-in animated numeral for TitleStrip's datum count. Renders the real, zero-padded
 * count as its initial/SSG/no-JS/reduced-motion text — never "00" in prerendered HTML
 * — then, only once GSAP loads and only when motion is allowed, counts up once when
 * scrolled into view.
 */
export function CountUpNumeral({ count }: { count: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const padded = String(count).padStart(2, '0');

  useEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const el = ref.current;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    loadScrollTrigger().then(({ gsap }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const state = { val: 0 };
        gsap.to(state, {
          val: count,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onStart: () => {
            el.textContent = '00';
          },
          onUpdate: () => {
            el.textContent = String(Math.round(state.val)).padStart(2, '0');
          },
        });
      });
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [count]);

  return <span ref={ref}>{padded}</span>;
}
