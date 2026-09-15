import { useEffect, useRef } from 'react';
import { Img } from './Img';
import { loadScrollTrigger, prefersReducedMotion } from '../../../shared/lib/scrollFx';
import type { MediaRow } from '../../../shared/supabase/types';

/**
 * Portfolio's one signature scroll-reveal moment — the cover image only (the gallery
 * grid and listing-page cards are deliberately untouched). A `transform: scaleX()`
 * overlay wipes away on scroll-into-view rather than animating `clip-path` (cheaper
 * to composite on low-end mobile) and never distorts the image itself, since the
 * `<img>` is untouched. Baseline DOM (no-JS / reduced-motion) bakes the overlay at
 * `scale-x-0` via a plain class — the image is never hidden if JS never runs.
 */
export function RevealImage({
  media,
  className = '',
  sizes,
}: {
  media: MediaRow | null | undefined;
  className?: string;
  sizes?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !containerRef.current || !overlayRef.current) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    loadScrollTrigger().then(({ gsap }) => {
      if (cancelled || !overlayRef.current || !containerRef.current) return;
      ctx = gsap.context(() => {
        gsap.set(overlayRef.current, { scaleX: 1 });
        gsap.to(overlayRef.current, {
          scaleX: 0,
          duration: 1.1,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: containerRef.current, start: 'top 75%', once: true },
        });
      }, containerRef);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-structural">
      <Img media={media} eager className={className} sizes={sizes} />
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 origin-right scale-x-0 bg-[color:var(--color-ink)]"
      />
    </div>
  );
}
