import { useLoaderData, Link, type LoaderFunctionArgs } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Container } from '../components/ui/Container';
import { Prose } from '../components/ui/Prose';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { ButtonLink } from '../components/ui/Button';
import { NotFoundPage } from './NotFoundPage';
import { getServiceBySlug, getServices, getSiteSettings } from '../../shared/content/queries';
import { breadcrumbJsonLd, serviceJsonLd } from '../../shared/seo';

export async function serviceDetailLoader({ params }: LoaderFunctionArgs) {
  const [service, settings] = await Promise.all([
    getServiceBySlug(params.slug ?? ''),
    getSiteSettings(),
  ]);
  return { service, settings };
}
type Data = Awaited<ReturnType<typeof serviceDetailLoader>>;

/** Prerender one page per published service. Empty (→ no static pages) pre-migration. */
export async function serviceStaticPaths() {
  const services = await getServices();
  return services.map((s) => `/services/${s.slug}`);
}

export function ServiceDetailPage() {
  const { service, settings } = useLoaderData() as Data;
  if (!service) return <NotFoundPage />;

  return (
    <>
      <SeoHead
        title={service.seo_title ?? `${service.title} — Platinum Point Automotive Engineering`}
        description={service.seo_description ?? service.summary}
        path={`/services/${service.slug}`}
        jsonLd={[
          serviceJsonLd(service, settings),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
            { name: service.title, path: `/services/${service.slug}` },
          ]),
        ]}
      />

      <section className="border-b border-[color:var(--color-line)] py-14">
        <Container narrow>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
            <Link to="/services">Services</Link> / {service.category ?? 'Service'}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-4xl">
            {service.title}
          </h1>
          <p className="mt-4 text-lg text-[color:var(--color-muted)]">{service.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/book" variant="accent">
              Book this service
            </ButtonLink>
            <ButtonLink to="/request-service" variant="outline">
              Request a quote
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section narrow>
        {service.description_md && <Prose markdown={service.description_md} />}
        {service.whats_included_md && (
          <>
            <h2 className="mt-10 text-xl font-bold text-[color:var(--color-ink)]">
              What&rsquo;s included
            </h2>
            <Prose markdown={service.whats_included_md} className="mt-3" />
          </>
        )}
        {service.faqs.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-bold text-[color:var(--color-ink)]">FAQs</h2>
            <dl className="mt-3 space-y-4">
              {service.faqs.map((f, i) => (
                <div key={i}>
                  <dt className="font-semibold text-[color:var(--color-ink)]">{f.q}</dt>
                  <dd className="text-[color:var(--color-muted)]">{f.a}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <div className="mt-12 rounded-lg border border-[color:var(--color-line)] p-5">
          <p className="font-semibold text-[color:var(--color-ink)]">Ready when you are.</p>
          <div className="mt-3">
            <CallWhatsApp context={`service-${service.slug}`} size="sm" />
          </div>
        </div>
      </Section>
    </>
  );
}
