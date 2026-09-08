import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Container } from '../components/ui/Container';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { ButtonLink } from '../components/ui/Button';
import { Prose } from '../components/ui/Prose';
import { ServiceCard, ProjectCard, TestimonialCard } from '../components/cards';
import {
  getContentBlocks,
  getProjects,
  getServices,
  getSiteSettings,
  getTestimonials,
} from '../../shared/content/queries';
import { localBusinessJsonLd } from '../../shared/seo';
import { BUSINESS } from '../../shared/business';

export async function homeLoader() {
  const [services, projects, testimonials, blocks, settings] = await Promise.all([
    getServices(),
    getProjects(),
    getTestimonials(),
    getContentBlocks(),
    getSiteSettings(),
  ]);
  return {
    services: services.slice(0, 6),
    projects: projects.slice(0, 3),
    testimonials: testimonials.slice(0, 3),
    blocks,
    settings,
  };
}

type Data = Awaited<ReturnType<typeof homeLoader>>;

export function HomePage() {
  const { services, projects, testimonials, blocks, settings } = useLoaderData() as Data;
  const heading = blocks['home.hero_heading'] ?? BUSINESS.name;
  const sub = blocks['home.hero_sub'] ?? '';
  const why = blocks['home.why_points'] ?? '';

  return (
    <>
      <SeoHead
        title="Platinum Point Automotive Engineering — mobile mechanic in Kitengela"
        description={
          settings?.default_seo?.description ??
          'Mobile mechanic, diagnostics, pre-purchase inspections, preventive maintenance and press & lathe engineering. Kitengela and across Kenya by arrangement.'
        }
        path="/"
        jsonLd={localBusinessJsonLd(settings)}
      />

      <section className="border-b border-[color:var(--color-line)] py-16 sm:py-24">
        <Container>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
            {BUSINESS.name}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-[color:var(--color-ink)] sm:text-5xl">
            {heading}
          </h1>
          {sub && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[color:var(--color-muted)]">
              {sub}
            </p>
          )}
          <p className="mt-8 font-semibold text-[color:var(--color-ink)]">
            Need help with your vehicle? Let&rsquo;s get it assessed.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CallWhatsApp context="home-hero" />
            <ButtonLink to="/request-service" variant="outline">
              Request a Service
            </ButtonLink>
          </div>
          <div className="mt-3">
            <ButtonLink to="/book" variant="outline">
              Or book a time
            </ButtonLink>
          </div>
        </Container>
      </section>

      {why && (
        <Section eyebrow="Why Platinum Point" title="Dealer-level work, wherever your vehicle is">
          <Prose markdown={why} />
        </Section>
      )}

      {services.length > 0 && (
        <Section
          eyebrow="Services"
          title="What we do"
          tint
          intro="Every job is quoted individually — tell us what you need and we come back with a price."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
          <div className="mt-8">
            <ButtonLink to="/services" variant="outline">
              All services
            </ButtonLink>
          </div>
        </Section>
      )}

      {projects.length > 0 && (
        <Section eyebrow="Recent work" title="Jobs we&rsquo;ve done">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </Section>
      )}

      {testimonials.length > 0 && (
        <Section eyebrow="Testimonials" title="What customers say" tint>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </Section>
      )}

      <Section title={blocks['cta.default'] ?? 'Get your vehicle looked at'}>
        <p className="max-w-xl text-[color:var(--color-muted)]">
          Call, WhatsApp, or send a request and we&rsquo;ll come back to you — usually within a few
          hours.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <CallWhatsApp context="home-footer-cta" />
          <ButtonLink to="/request-service" variant="outline">
            Request a Service
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
