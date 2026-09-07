import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { ServiceCard } from '../components/cards';
import { getServices } from '../../shared/content/queries';
import { breadcrumbJsonLd } from '../../shared/seo';

export async function servicesLoader() {
  return { services: await getServices() };
}
type Data = Awaited<ReturnType<typeof servicesLoader>>;

export function ServicesPage() {
  const { services } = useLoaderData() as Data;
  return (
    <>
      <SeoHead
        title="Services — Platinum Point Automotive Engineering"
        description="Mobile repairs, diagnostics, pre-purchase and mechanical inspections, preventive maintenance, road tests, and press & lathe engineering."
        path="/services"
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
        ])}
      />
      <Section
        eyebrow="Services"
        title="What we do"
        intro="Pricing is per job — request a quote through the booking or service form."
      >
        {services.length === 0 ? (
          <p className="text-[color:var(--color-muted)]">
            Services are being added. Please check back.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
