import { Outlet } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { Wordmark } from './components/Wordmark';
import { BUSINESS } from '../shared/business';

/**
 * Public site shell (Phase 1: header + footer + <Outlet />). Prerendered.
 * Real navigation / pages arrive in Phase 2.
 */
export function PublicLayout() {
  return (
    <>
      <Head>
        <html lang="en" />
        <meta name="robots" content="index,follow" />
      </Head>

      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-[color:var(--color-line)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Wordmark />
            <div className="flex items-center gap-2">
              <a
                href={`tel:${BUSINESS.phoneE164}`}
                className="rounded-md border border-[color:var(--color-line)] px-3 py-2 text-sm font-semibold text-[color:var(--color-ink)] hover:border-signal"
              >
                Call
              </a>
              <a
                href={BUSINESS.whatsappUrl}
                className="rounded-md bg-signal px-3 py-2 text-sm font-semibold text-paper hover:opacity-90"
                rel="noopener noreferrer"
                target="_blank"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
          <Outlet />
        </main>

        <footer className="border-t border-[color:var(--color-line)]">
          <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-[color:var(--color-muted)]">
            <p className="font-semibold text-[color:var(--color-ink)]">{BUSINESS.name}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest">
              {BUSINESS.baseArea} · {BUSINESS.phoneDisplay}
            </p>
            <p className="mt-3">
              Serving {BUSINESS.serviceAreaSummary}. © {new Date().getFullYear()} {BUSINESS.name}.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
