import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Prose } from '../components/ui/Prose';
import { PartnerItem } from '../components/cards';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { getContentBlocks, getPartners } from '../../shared/content/queries';

export async function aboutLoader() {
  const [blocks, partners] = await Promise.all([getContentBlocks(), getPartners()]);
  return { body: blocks['about.body'] ?? '', partners };
}
type Data = Awaited<ReturnType<typeof aboutLoader>>;

export function AboutPage() {
  const { body, partners } = useLoaderData() as Data;
  return (
    <>
      <SeoHead
        title="About — Platinum Point Automotive Engineering"
        description="A former DT Dobie engineer running a mobile automotive workshop from Kitengela, with in-house press and lathe engineering."
        path="/about"
      />
      <Section eyebrow="About" title="The expert who comes to you" narrow>
        {body ? (
          <Prose markdown={body} />
        ) : (
          <p className="text-[color:var(--color-muted)]">About content is being written.</p>
        )}
      </Section>

      {partners.length > 0 && (
        <Section eyebrow="Partners" title="Who we work with" tint narrow>
          <p className="mb-4 text-[color:var(--color-muted)]">
            Bodywork and specialist jobs are handled through trusted partners, with Platinum Point
            as your single point of contact.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {partners.map((p) => (
              <PartnerItem key={p.id} partner={p} />
            ))}
          </ul>
        </Section>
      )}

      <Section narrow>
        <CallWhatsApp context="about" size="sm" />
      </Section>
    </>
  );
}
