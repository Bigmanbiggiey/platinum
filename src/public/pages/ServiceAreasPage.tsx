import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { getContentBlocks, getServiceAreas } from '../../shared/content/queries';
import { BUSINESS } from '../../shared/business';

export async function serviceAreasLoader() {
  const [areas, blocks] = await Promise.all([getServiceAreas(), getContentBlocks()]);
  return { areas, intro: blocks['areas.intro'] ?? '' };
}
type Data = Awaited<ReturnType<typeof serviceAreasLoader>>;

export function ServiceAreasPage() {
  const { areas, intro } = useLoaderData() as Data;
  const primary = areas.filter((a) => a.is_primary);
  const others = areas.filter((a) => !a.is_primary);
  return (
    <>
      <SeoHead
        title="Service areas — Platinum Point Automotive Engineering"
        description={`Based in ${BUSINESS.baseArea}. Serving ${BUSINESS.serviceAreaSummary}.`}
        path="/service-areas"
      />
      <Section
        eyebrow="Service areas"
        title="Where we work"
        intro={intro || `Based in ${BUSINESS.baseArea}. ${BUSINESS.serviceAreaSummary}.`}
      >
        {primary.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {primary.map((a) => (
              <li
                key={a.id}
                className="rounded-full bg-signal px-3 py-1 text-sm font-semibold text-paper"
              >
                {a.name}
              </li>
            ))}
          </ul>
        )}
        {others.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {others.map((a) => (
              <li key={a.id} className="rounded-lg border border-[color:var(--color-line)] p-4">
                <p className="font-semibold text-[color:var(--color-ink)]">{a.name}</p>
                {a.region && <p className="text-xs text-[color:var(--color-muted)]">{a.region}</p>}
                {a.note && <p className="mt-1 text-sm text-[color:var(--color-muted)]">{a.note}</p>}
              </li>
            ))}
          </ul>
        )}
        {areas.length === 0 && (
          <p className="text-[color:var(--color-muted)]">
            Based in {BUSINESS.baseArea}; {BUSINESS.serviceAreaSummary}.
          </p>
        )}
        <div className="mt-8">
          <CallWhatsApp context="service-areas" size="sm" />
        </div>
      </Section>
    </>
  );
}
