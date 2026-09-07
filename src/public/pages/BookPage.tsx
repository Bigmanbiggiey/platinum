import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { EnquiryForm } from '../forms/EnquiryForm';
import { getContentBlocks } from '../../shared/content/queries';

export async function bookLoader() {
  const blocks = await getContentBlocks();
  const windows = (blocks['booking.time_windows'] ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return { note: blocks['booking.expectation'] ?? '', windows };
}
type Data = Awaited<ReturnType<typeof bookLoader>>;

export function BookPage() {
  const { note, windows } = useLoaderData() as Data;
  return (
    <>
      <SeoHead
        title="Book a service — Platinum Point Automotive Engineering"
        description="Request a booking with a preferred date and time window. We confirm by call or WhatsApp."
        path="/book"
        noindex={false}
      />
      <Section
        eyebrow="Book a service"
        title="Request a booking"
        narrow
        intro={
          note ||
          'Choose a preferred date and time window. Bookings are requests — we confirm by call or WhatsApp, usually within a few hours.'
        }
      >
        <EnquiryForm
          variant="booking"
          timeWindows={windows}
          confirmationNote="We&rsquo;ll confirm your booking by call or WhatsApp, usually within a few hours."
        />
      </Section>
    </>
  );
}
