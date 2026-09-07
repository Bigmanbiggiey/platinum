import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { EnquiryForm } from '../forms/EnquiryForm';
import { getSiteSettings } from '../../shared/content/queries';
import { localBusinessJsonLd } from '../../shared/seo';
import { BUSINESS } from '../../shared/business';

export async function contactLoader() {
  return { settings: await getSiteSettings() };
}
type Data = Awaited<ReturnType<typeof contactLoader>>;

export function ContactPage() {
  const { settings } = useLoaderData() as Data;
  const hours = settings?.hours ?? BUSINESS.hours;
  return (
    <>
      <SeoHead
        title="Contact — Platinum Point Automotive Engineering"
        description="Call or WhatsApp Platinum Point, or send a message. Kitengela, Kenya."
        path="/contact"
        jsonLd={localBusinessJsonLd(settings)}
      />
      <Section eyebrow="Contact" title="Get in touch">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <CallWhatsApp context="contact" />
            <dl className="mt-8 space-y-4 text-sm">
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                  Phone / WhatsApp
                </dt>
                <dd className="mt-1">
                  <a href={`tel:${BUSINESS.phoneE164}`} className="font-semibold">
                    {BUSINESS.phoneDisplay}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                  Email
                </dt>
                <dd className="mt-1">
                  <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                  Base
                </dt>
                <dd className="mt-1 text-[color:var(--color-muted)]">{BUSINESS.baseAreaDetail}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                  Hours
                </dt>
                <dd className="mt-1 space-y-0.5 text-[color:var(--color-muted)]">
                  {hours.map((h) => (
                    <div key={h.days}>
                      <span className="text-[color:var(--color-ink)]">{h.days}</span> · {h.label}
                    </div>
                  ))}
                </dd>
              </div>
              {settings?.gbp_url && (
                <div>
                  <dd>
                    <a href={settings.gbp_url} target="_blank" rel="noopener noreferrer">
                      Find us on Google
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[color:var(--color-ink)]">Send a message</h2>
            <div className="mt-4">
              <EnquiryForm variant="contact" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
