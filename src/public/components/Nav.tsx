import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Wordmark } from './Wordmark';
import { CallWhatsApp } from './ui/CallWhatsApp';
import { ButtonLink } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { loadGsapCore, prefersReducedMotion } from '../../shared/lib/scrollFx';
import { useMenuDismiss } from '../../shared/lib/useMenuDismiss';
import { useMediaQuery } from '../../shared/lib/useMediaQuery';

const links = [
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Work' },
  { to: '/service-areas', label: 'Areas' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

/** The phone menu adds Home and Testimonials; Book a service follows as a button. */
const mobileLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Work' },
  { to: '/service-areas', label: 'Areas' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

/**
 * Site header. From 768 px: inline links + Call/WhatsApp. Below: a Menu button opening a
 * solid sheet over a dimmed page (docs/superpowers/plans/2026-10-20-mobile-nav.md, A-3).
 * The sheet and backdrop sit outside <header>: its backdrop-filter would otherwise
 * become their containing block and pin them inside the header.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  // Kept mounted after `open` goes false, long enough to play the exit tween.
  const [mounted, setMounted] = useState(false);
  const [top, setTop] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const closingForRoute = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const show = open || mounted;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 pb-0.5 text-sm font-semibold transition-colors ${
      isActive
        ? 'border-[color:var(--color-confirm)] text-[color:var(--color-confirm-text)]'
        : 'border-transparent text-[color:var(--color-muted)]'
    } hover:text-[color:var(--color-ink)]`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-12 items-center border-l-[3px] pl-4 pr-3 text-base font-semibold ${
      isActive
        ? 'border-[color:var(--color-confirm)] text-[color:var(--color-confirm-text)]'
        : 'border-transparent text-[color:var(--color-ink)] hover:border-[color:var(--color-line)]'
    }`;

  const toggle = () => {
    if (!open && headerRef.current)
      setTop(Math.round(headerRef.current.getBoundingClientRect().bottom));
    setOpen((v) => !v);
  };
  const close = () => setOpen(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // A route change (link, Back/Forward) closes the menu; focus then goes to the new page.
  useEffect(() => {
    if (!openRef.current) return;
    closingForRoute.current = true;
    setOpen(false);
  }, [pathname]);

  // Widening past the breakpoint hides the sheet; don't leave the page locked behind it.
  useEffect(() => {
    if (isDesktop) setOpen(false);
  }, [isDesktop]);

  useMenuDismiss({
    open,
    onClose: close,
    panelRef,
    toggleRef,
    inertSelectors: ['#main', 'footer'],
    focusOnClose: () => {
      const toPage = closingForRoute.current;
      closingForRoute.current = false;
      return toPage ? document.getElementById('main') : toggleRef.current;
    },
  });

  useEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel) return;

    if (prefersReducedMotion()) {
      if (!open) setMounted(false);
      return;
    }

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    loadGsapCore()
      .then(({ gsap }) => {
        if (cancelled) return;
        ctx = gsap.context(() => {
          if (open) {
            // Opacity only on the way in: autoAlpha's visibility:hidden would drop the
            // focus useMenuDismiss has just put on the first link.
            const items = panel.querySelectorAll('[data-mobile-nav-link]');
            if (backdrop) gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.2 });
            gsap.fromTo(
              panel,
              { opacity: 0, y: -8 },
              { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
            );
            gsap.fromTo(
              items,
              { opacity: 0, y: -6 },
              { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger: 0.03, delay: 0.05 },
            );
          } else {
            if (backdrop) gsap.to(backdrop, { autoAlpha: 0, duration: 0.18 });
            gsap.to(panel, {
              autoAlpha: 0,
              y: -8,
              duration: 0.18,
              ease: 'power2.in',
              onComplete: () => {
                if (!cancelled) setMounted(false);
              },
            });
          }
        });
      })
      .catch(() => {
        // gsap failed to load — don't leave the panel stuck open forever.
        if (!cancelled && !open) setMounted(false);
      });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [open]);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-40 border-b border-[color:var(--color-line)] bg-[color:var(--color-ground)]/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <Wordmark />

          <nav className="hidden items-center gap-5 md:flex lg:gap-6" aria-label="Primary">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions: Call/WhatsApp (desktop), the light/dark toggle, then Menu (phones). */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:block">
              <CallWhatsApp context="header" size="sm" compact />
            </div>

            <ThemeToggle />

            <button
              ref={toggleRef}
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-md border border-[color:var(--color-line)] md:hidden"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label="Menu"
              onClick={toggle}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <line
                  x1="3"
                  y1="6"
                  x2="17"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`origin-center transition-transform duration-300 ease-out motion-reduce:transition-none ${
                    open ? 'translate-y-[4px] rotate-45' : ''
                  }`}
                />
                <line
                  x1="3"
                  y1="10"
                  x2="17"
                  y2="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`origin-center transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                    open ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <line
                  x1="3"
                  y1="14"
                  x2="17"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`origin-center transition-transform duration-300 ease-out motion-reduce:transition-none ${
                    open ? '-translate-y-[4px] -rotate-45' : ''
                  }`}
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {show && (
        <>
          {/* Dimmed page; a tap closes. Out of the tab order — Escape and Menu close too. */}
          <button
            ref={backdropRef}
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={close}
            className="fixed inset-x-0 bottom-0 z-30 bg-graphite/50 md:hidden"
            style={{ top }}
          />
          {/* Its own scroll on short (landscape) screens; stops above the contact bar. */}
          <div
            id="site-menu"
            ref={panelRef}
            className="fixed inset-x-0 z-40 overflow-y-auto overscroll-contain border-b border-[color:var(--color-line)] bg-[color:var(--color-ground)] px-5 pb-5 pt-2 md:hidden"
            style={{ top, maxHeight: `calc(100dvh - ${top}px - 3.25rem)` }}
          >
            <nav className="mx-auto flex max-w-5xl flex-col" aria-label="Mobile">
              {mobileLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end ?? false}
                  data-mobile-nav-link
                  className={mobileLinkClass}
                  onClick={close}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="mx-auto mt-3 max-w-5xl" data-mobile-nav-link>
              <ButtonLink to="/book" className="min-h-12 w-full text-base" onClick={close}>
                Book a service
              </ButtonLink>
            </div>
          </div>
        </>
      )}
    </>
  );
}
