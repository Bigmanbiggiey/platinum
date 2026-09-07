import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Wordmark } from './Wordmark';
import { CallWhatsApp } from './ui/CallWhatsApp';

const links = [
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Work' },
  { to: '/service-areas', label: 'Areas' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold ${isActive ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-muted)]'} hover:text-[color:var(--color-ink)]`;

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
          <CallWhatsApp context="header" size="sm" />
        </div>

        <button
          type="button"
          className="rounded-md border border-[color:var(--color-line)] p-2 md:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-[color:var(--color-line)] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="text-base font-semibold text-[color:var(--color-ink)]"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4">
            <CallWhatsApp context="header-mobile" size="sm" />
          </div>
        </div>
      )}
    </header>
  );
}
