import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * After an in-app navigation, move focus to the page's main content so keyboard and
 * screen-reader users start on the new page rather than at the top of the document
 * (docs/superpowers/plans/2026-10-20-mobile-nav.md, P3). Never on the first load, and
 * not for in-page `#hash` links. `preventScroll` leaves scroll restoration alone.
 */
export function useFocusOnNavigate(targetRef: RefObject<HTMLElement | null>): void {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.location.hash) return;
    targetRef.current?.focus({ preventScroll: true });
  }, [pathname, targetRef]);
}
