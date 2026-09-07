/** Temporary landing for admin sections still to be built in Phase 3. */
export function PlaceholderPage({ title, wp }: { title: string; wp: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-platinum">
        Coming in Phase 3 · {wp}. See <code>docs/phase-3-plan.md</code>.
      </p>
    </section>
  );
}
