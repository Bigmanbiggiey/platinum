import type { ReactNode } from 'react';
import { Head } from 'vite-react-ssg';

/**
 * Admin chrome. Always `noindex` — the admin must never be crawled or prerendered.
 * Committed to the Graphite ground regardless of the viewer's theme.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-graphite text-paper" data-theme="dark">
      <Head>
        <meta name="robots" content="noindex,nofollow" />
        <title>Admin — Platinum Point Automotive Engineering</title>
      </Head>

      <header className="border-b border-slate/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-platinum">
            Platinum Point · Admin
          </span>
          <span className="rounded bg-slate px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-steel">
            Phase 1 skeleton
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
