import { useEffect, useRef, type RefObject } from 'react';

/**
 * Swipe a left-hand drawer away (docs/superpowers/plans/2026-10-20-mobile-phase-b.md,
 * B-1). While a finger drags left the drawer follows it; letting go past 30 % of its
 * width, or with a quick flick, closes it, and anything less springs it back. A drag that
 * starts vertical is left to the browser, so the drawer still scrolls normally (the
 * drawer carries `touch-action: pan-y`).
 */
export function useSwipeToClose(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let dx = 0;
    let mode: 'idle' | 'deciding' | 'dragging' | 'scrolling' = 'idle';

    const reset = () => {
      el.style.transition = '';
      el.style.transform = '';
      mode = 'idle';
      dx = 0;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = performance.now();
      dx = 0;
      mode = 'deciding';
    };

    const onMove = (e: TouchEvent) => {
      if (mode === 'idle' || mode === 'scrolling') return;
      const x = e.touches[0].clientX - startX;
      const y = e.touches[0].clientY - startY;
      if (mode === 'deciding') {
        if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
        mode = Math.abs(x) > Math.abs(y) && x < 0 ? 'dragging' : 'scrolling';
        if (mode === 'scrolling') return;
        el.style.transition = 'none';
      }
      dx = Math.min(0, x);
      el.style.transform = `translateX(${dx}px)`;
    };

    const onEnd = () => {
      if (mode !== 'dragging') {
        mode = 'idle';
        return;
      }
      const width = el.getBoundingClientRect().width || 1;
      const velocity = dx / Math.max(1, performance.now() - startT); // px per ms, negative = left
      const close = dx < -0.3 * width || velocity < -0.5;
      reset();
      if (close) onCloseRef.current();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', reset);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', reset);
      reset();
    };
  }, [ref, enabled]);
}
