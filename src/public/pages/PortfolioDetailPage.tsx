import { useLoaderData, Link, type LoaderFunctionArgs } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Container } from '../components/ui/Container';
import { Prose } from '../components/ui/Prose';
import { Img } from '../components/ui/Img';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { NotFoundPage } from './NotFoundPage';
import { getProjectBySlug, getProjects } from '../../shared/content/queries';
import { breadcrumbJsonLd } from '../../shared/seo';

export async function portfolioDetailLoader({ params }: LoaderFunctionArgs) {
  return { project: await getProjectBySlug(params.slug ?? '') };
}
type Data = Awaited<ReturnType<typeof portfolioDetailLoader>>;

export async function portfolioStaticPaths() {
  const projects = await getProjects();
  return projects.map((p) => `/portfolio/${p.slug}`);
}

export function PortfolioDetailPage() {
  const { project } = useLoaderData() as Data;
  if (!project) return <NotFoundPage />;
  const vehicle = [project.vehicle_make, project.vehicle_model, project.vehicle_year]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <SeoHead
        title={`${project.title} — Platinum Point`}
        description={project.summary}
        path={`/portfolio/${project.slug}`}
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Work', path: '/portfolio' },
          { name: project.title, path: `/portfolio/${project.slug}` },
        ])}
      />

      <section className="border-b border-[color:var(--color-line)] py-14">
        <Container narrow>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
            <Link to="/portfolio">Work</Link>
            {vehicle && ` / ${vehicle}`}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-4xl">
            {project.title}
          </h1>
          <p className="mt-4 text-lg text-[color:var(--color-muted)]">{project.summary}</p>
        </Container>
      </section>

      <Section narrow>
        {project.cover && (
          <Img
            media={project.cover}
            eager
            className="w-full rounded-lg"
            sizes="(min-width: 768px) 640px, 100vw"
          />
        )}
        {project.body_md && <Prose markdown={project.body_md} className="mt-8" />}
        {project.outcome && (
          <p className="mt-8 rounded-lg border border-[color:var(--color-line)] p-4 text-[color:var(--color-ink)]">
            <span className="font-semibold">Outcome:</span> {project.outcome}
          </p>
        )}
        {project.gallery.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {project.gallery.map((m) => (
              <Img key={m.id} media={m} className="w-full rounded-lg" />
            ))}
          </div>
        )}
        <div className="mt-12">
          <CallWhatsApp context={`portfolio-${project.slug}`} size="sm" />
        </div>
      </Section>
    </>
  );
}
