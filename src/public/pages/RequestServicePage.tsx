import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { EnquiryForm } from '../forms/EnquiryForm';

export function RequestServicePage() {
  return (
    <>
      <SeoHead
        title="Request a service — Platinum Point Automotive Engineering"
        description="Tell us what your vehicle needs — repair, diagnostics, maintenance or engineering — and we'll come back with a quote."
        path="/request-service"
      />
      <Section
        eyebrow="Request a service"
        title="What does your vehicle need?"
        narrow
        intro="Pricing is per job. Send the details and we'll come back with a quote by call or WhatsApp."
      >
        <EnquiryForm variant="service" />
      </Section>
    </>
  );
}
