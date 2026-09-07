import { Link } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';

export function NotFoundPage() {
  return (
    <>
      <SeoHead
        title="Page not found — Platinum Point Automotive Engineering"
        description="That page could not be found."
        path="/404"
        noindex
      />
      <Section eyebrow="404" title="We couldn&rsquo;t find that page" narrow>
        <p className="text-[color:var(--color-muted)]">
          Try the{' '}
          <Link to="/" className="font-semibold">
            home page
          </Link>{' '}
          or our{' '}
          <Link to="/services" className="font-semibold">
            services
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
