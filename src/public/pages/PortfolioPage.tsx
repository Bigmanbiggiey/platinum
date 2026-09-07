import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { ProjectCard } from '../components/cards';
import { getProjects } from '../../shared/content/queries';
import { breadcrumbJsonLd } from '../../shared/seo';

export async function portfolioLoader() {
  return { projects: await getProjects() };
}
type Data = Awaited<ReturnType<typeof portfolioLoader>>;

export function PortfolioPage() {
  const { projects } = useLoaderData() as Data;
  return (
    <>
      <SeoHead
        title="Our work — Platinum Point Automotive Engineering"
        description="A selection of repairs, diagnostics and engineering jobs completed by Platinum Point."
        path="/portfolio"
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Work', path: '/portfolio' },
        ])}
      />
      <Section eyebrow="Our work" title="Jobs we&rsquo;ve done">
        {projects.length === 0 ? (
          <p className="max-w-lg text-[color:var(--color-muted)]">
            We&rsquo;re adding write-ups of recent jobs. In the meantime, ask us about work on your
            make and model.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
