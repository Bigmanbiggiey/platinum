import { useLoaderData, Link, type LoaderFunctionArgs } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Container } from '../components/ui/Container';
import { DATUM_TEXT_CLASS } from '../components/ui/TitleStrip';
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
          <p className={DATUM_TEXT_CLASS}>
            <Link to="/services">Services</Link> / {service.category ?? 'Service'}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-4xl">
            {service.title}
          </h1>
          <p className="mt-4 text-lg text-[color:var(--color-muted)]">{service.summary}</p>
        </Container>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,65ch)_1fr] lg:items-start lg:gap-16">
          <div>
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
          </div>

          <aside className="order-first rounded-structural border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 lg:sticky lg:top-16 lg:order-none">
            <p className={DATUM_TEXT_CLASS}>Category</p>
            <p className="mt-1 font-semibold text-[color:var(--color-ink)]">
              {service.category ?? 'General'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <ButtonLink to="/book" variant="accent">
                Book this service
              </ButtonLink>
              <ButtonLink to="/request-service" variant="outline">
                Request a quote
              </ButtonLink>
            </div>
            <div className="mt-5 border-t border-[color:var(--color-line)] pt-5">
              <CallWhatsApp context={`service-${service.slug}`} size="sm" />
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
