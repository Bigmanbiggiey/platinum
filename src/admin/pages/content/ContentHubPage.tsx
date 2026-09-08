import { Link } from 'react-router-dom';
import { Card, PageTitle } from '../../components/ui';

const sections = [
  { to: 'services', title: 'Services', desc: 'What you offer — the SEO landing pages.' },
  { to: 'portfolio', title: 'Portfolio', desc: 'Documented jobs shown on the site.' },
  { to: 'testimonials', title: 'Testimonials', desc: 'Moderate customer feedback.' },
  { to: 'media', title: 'Media library', desc: 'Images for portfolio and services.' },
  { to: 'copy', title: 'Page copy', desc: 'Editable text blocks (hero, about, etc.).' },
  { to: 'areas', title: 'Service areas', desc: 'Where you work.' },
  { to: 'partners', title: 'Partners', desc: 'Trusted bodywork / garage partners.' },
];

export function ContentHubPage() {
  return (
    <section>
      <PageTitle>Website content</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.to} to={`/admin/content/${s.to}`}>
            <Card className="h-full hover:border-signal">
              <p className="font-semibold text-[color:var(--color-ink)]">{s.title}</p>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
