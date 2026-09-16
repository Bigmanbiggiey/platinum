import type { gsap as gsapType } from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

let scrollTriggerRegistered = false;
let corePromise: Promise<{ gsap: typeof gsapType }> | null = null;
let scrollTriggerPromise: Promise<{
  gsap: typeof gsapType;
  ScrollTrigger: typeof ScrollTriggerType;
}> | null = null;

/**
 * Just the gsap tweening engine — no ScrollTrigger. For value-arrival animations
 * (e.g. a number tweening in once data loads) that don't need scroll position.
 * Must only be called inside an effect (never a render body).
 */
export function loadGsapCore() {
  if (!corePromise) {
    corePromise = import('gsap')
      .then(({ gsap }) => ({ gsap }))
      .catch((err) => {
        // Don't memoize a failed import — a flaky connection should get a real retry
        // on the next call, not a permanently-rejected cached promise.
        corePromise = null;
        throw err;
      });
  }
  return corePromise;
}

/**
 * gsap + ScrollTrigger, registered exactly once (guards SPA route re-entry). For
 * anything triggered by scroll position. Must only be called inside an effect.
 */
export function loadScrollTrigger() {
  if (!scrollTriggerPromise) {
    scrollTriggerPromise = Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (!scrollTriggerRegistered) {
          gsap.registerPlugin(ScrollTrigger);
          // Mobile-first audience: address-bar show/hide shouldn't re-trigger recalcs.
          ScrollTrigger.config({ ignoreMobileResize: true });
          scrollTriggerRegistered = true;
        }
        return { gsap, ScrollTrigger };
      })
      .catch((err) => {
        scrollTriggerPromise = null;
        throw err;
      });
  }
  return scrollTriggerPromise;
}

/** Must only be called inside an effect (never render body). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
