import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Wordmark } from './Wordmark';
import { CallWhatsApp } from './ui/CallWhatsApp';
import { loadGsapCore, prefersReducedMotion } from '../../shared/lib/scrollFx';

const links = [
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Work' },
  { to: '/service-areas', label: 'Areas' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 pb-0.5 text-sm font-semibold transition-colors ${
      isActive
        ? 'border-[color:var(--color-confirm)] text-[color:var(--color-confirm)]'
        : 'border-transparent text-[color:var(--color-muted)]'
    } hover:text-[color:var(--color-ink)]`;

  // Keep the panel mounted while open, and long enough to play its exit tween —
  // React's instant unmount on `open` going false would otherwise skip it entirely.
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!mounted || !panelRef.current) return;
    const panel = panelRef.current;

    if (prefersReducedMotion()) {
      if (!open) setMounted(false);
      return;
    }

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    loadGsapCore().then(({ gsap }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        if (open) {
          const items = panel.querySelectorAll('[data-mobile-nav-link]');
          gsap.fromTo(
            panel,
            { autoAlpha: 0, y: -8 },
            { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' },
          );
          gsap.fromTo(
            items,
            { autoAlpha: 0, y: -6 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.22,
              ease: 'power2.out',
              stagger: 0.04,
              delay: 0.05,
            },
          );
        } else {
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
    }).catch(() => {
      // gsap failed to load — don't leave the panel stuck open forever.
      if (!cancelled && !open) setMounted(false);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [open, mounted]);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-line)] bg-[color:var(--color-ground)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Wordmark />

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          <CallWhatsApp context="header" size="sm" compact />
        </div>

        <button
          type="button"
          className="rounded-md border border-[color:var(--color-line)] p-2 md:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
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

      {mounted && (
        <div
          ref={panelRef}
          className="border-t border-[color:var(--color-line)] px-5 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                data-mobile-nav-link
                className="text-base font-semibold text-[color:var(--color-ink)]"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4" data-mobile-nav-link>
            <CallWhatsApp context="header-mobile" size="sm" />
          </div>
        </div>
      )}
    </header>
  );
}
