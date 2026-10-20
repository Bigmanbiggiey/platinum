import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Options {
  /** The menu is showing (and this hook should act). */
  open: boolean;
  onClose: () => void;
  /** The menu panel; focus moves to its first link or button on open. */
  panelRef: RefObject<HTMLElement | null>;
  /** The button that opened it; focus returns here on close by default. */
  toggleRef: RefObject<HTMLElement | null>;
  /** Stop the page scrolling behind the menu. */
  lockScroll?: boolean;
  /** Elements made `inert` while open, so keyboard and screen readers stay in the menu. */
  inertSelectors?: string[];
  /**
   * Where focus goes when the menu closes, decided at close time (after `inert`
   * is lifted, so the page can take focus). Defaults to the toggle; return the page's main
   * content when the menu closed because the route changed.
   */
  focusOnClose?: () => HTMLElement | null | undefined;
}

/**
 * Shared behaviour for the site menu and the admin drawer (docs/superpowers/plans/
 * 2026-10-20-mobile-nav.md, A-1): Escape closes; focus moves into the menu and back to
 * its button; the page behind can't scroll and is `inert`. Everything set here is put
 * back exactly as it was when the menu closes or the component unmounts.
 */
export function useMenuDismiss({
  open,
  onClose,
  panelRef,
  toggleRef,
  lockScroll = true,
  inertSelectors = [],
  focusOnClose,
}: Options): void {
  // Latest callbacks without re-running the effect (and re-locking) when they change.
  const onCloseRef = useRef(onClose);
  const focusRef = useRef(focusOnClose);
  onCloseRef.current = onClose;
  focusRef.current = focusOnClose;
  const selectors = inertSelectors.join(',');

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    // The menu and its button stay the same nodes while it's open (the panel is kept
    // mounted through its exit), so capture them once for the cleanup.
    const panel = panelRef.current;
    const toggle = toggleRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = root.style.overflow;
    if (lockScroll) root.style.overflow = 'hidden';

    const inerted = selectors
      ? [...document.querySelectorAll<HTMLElement>(selectors)].filter(
          (el) => !el.hasAttribute('inert'),
        )
      : [];
    for (const el of inerted) el.setAttribute('inert', '');

    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      if (lockScroll) root.style.overflow = prevOverflow;
      for (const el of inerted) el.removeAttribute('inert');
      const active = document.activeElement;
      const focusWasInMenu = !active || active === document.body || !!panel?.contains(active);
      if (!focusWasInMenu) return;
      const target = focusRef.current ? focusRef.current() : toggle;
      target?.focus({ preventScroll: true });
    };
  }, [open, lockScroll, selectors, panelRef, toggleRef]);
}
