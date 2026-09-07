import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { EnquiryForm } from '../forms/EnquiryForm';
import { breadcrumbJsonLd } from '../../shared/seo';

export function RequestInspectionPage() {
  return (
    <>
      <SeoHead
        title="Request a pre-purchase inspection — Platinum Point"
        description="Buying a used car? Request an independent pre-purchase or mechanical inspection, done wherever the vehicle is."
        path="/request-inspection"
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Request an inspection', path: '/request-inspection' },
        ])}
      />
      <Section
        eyebrow="Pre-purchase inspection"
        title="Check before you buy"
        narrow
        intro="Tell us where the car is and when you can view it. We inspect the vehicle, road test it and run a diagnostics scan, then give you a clear verdict."
      >
        <EnquiryForm
          variant="inspection"
          confirmationNote="We&rsquo;ll call or WhatsApp to arrange a time with you and the seller."
        />
      </Section>
    </>
  );
}
