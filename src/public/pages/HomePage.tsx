import { Head } from 'vite-react-ssg';
import { BUSINESS } from '../../shared/business';

/**
 * Placeholder home page for the Phase 1 skeleton. Confirms the prerender pipeline,
 * brand tokens and type stack render. The real home page is built in Phase 2.
 */
export function HomePage() {
  return (
    <>
      <Head>
        <title>Platinum Point Automotive Engineering — mobile mechanic & vehicle engineering</title>
        <meta
          name="description"
          content="Mobile mechanic, diagnostics, pre-purchase inspections, preventive maintenance and engineering (press & lathe). Kitengela and across Kenya by arrangement."
        />
      </Head>

      <section>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
          Phase 1 · Foundation skeleton
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-[color:var(--color-ink)] sm:text-5xl">
          The expert who comes to you.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[color:var(--color-muted)]">
          {BUSINESS.name} is a mobile automotive workshop run by {BUSINESS.owner}, a former DT Dobie
          engineer. General repairs, diagnostics, pre-purchase inspections, preventive maintenance,
          and press &amp; lathe engineering — {BUSINESS.serviceAreaSummary}.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`tel:${BUSINESS.phoneE164}`}
            className="rounded-md bg-[color:var(--color-ink)] px-4 py-2.5 text-sm font-semibold text-paper hover:opacity-90"
          >
            Call {BUSINESS.phoneDisplay}
          </a>
          <a
            href={BUSINESS.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-paper hover:opacity-90"
          >
            Message on WhatsApp
          </a>
        </div>

        <p className="mt-10 border-t border-[color:var(--color-line)] pt-6 text-sm text-[color:var(--color-muted)]">
          This is a development skeleton. Pages, content and the admin platform are built in later,
          separately-approved phases.
        </p>
      </section>
    </>
  );
}
