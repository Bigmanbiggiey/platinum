import { useLoaderData, Link, type LoaderFunctionArgs } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Container } from '../components/ui/Container';
import { DATUM_TEXT_CLASS } from '../components/ui/TitleStrip';
import { Prose } from '../components/ui/Prose';
import { Img } from '../components/ui/Img';
import { RevealImage } from '../components/ui/RevealImage';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { NotFoundPage } from './NotFoundPage';
import { JobTimeline } from '../components/JobTimeline';
import { getJobPublic, getProjectBySlug, getProjects } from '../../shared/content/queries';
import { breadcrumbJsonLd, documentedJobJsonLd } from '../../shared/seo';

export async function portfolioDetailLoader({ params }: LoaderFunctionArgs) {
  const project = await getProjectBySlug(params.slug ?? '');
  // A published job (J2) renders its timeline from the job_public view.
  const job = project?.job_id ? await getJobPublic(project.job_id) : null;
  return { project, job };
}
type Data = Awaited<ReturnType<typeof portfolioDetailLoader>>;

export async function portfolioStaticPaths() {
  const projects = await getProjects();
  return projects.map((p) => `/portfolio/${p.slug}`);
}

export function PortfolioDetailPage() {
  const { project, job } = useLoaderData() as Data;
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
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Work', path: '/portfolio' },
            { name: project.title, path: `/portfolio/${project.slug}` },
          ]),
          ...(job
            ? [
                documentedJobJsonLd({
                  slug: project.slug,
                  title: project.title,
                  summary: project.summary,
                  vehicleLabel: job.vehicle_label,
                  serviceTitle: job.service_title,
                }),
              ]
            : []),
        ]}
      />

      <section className="border-b border-[color:var(--color-line)] py-14">
        <Container narrow>
          <p className={DATUM_TEXT_CLASS}>
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
        {job ? (
          <>
            <p className={DATUM_TEXT_CLASS}>Job {job.job_number}</p>
            <JobTimeline job={job} />
          </>
        ) : (
          <ManualProject project={project} />
        )}
        <div className="mt-12">
          <CallWhatsApp context={`portfolio-${project.slug}`} size="sm" />
        </div>
      </Section>
    </>
  );
}

/** A hand-written portfolio entry (not linked to a job). */
function ManualProject({ project }: { project: NonNullable<Data['project']> }) {
  return (
    <>
      {project.cover && (
        <RevealImage
          media={project.cover}
          className="w-full"
          sizes="(min-width: 768px) 640px, 100vw"
        />
      )}
      {project.body_md && <Prose markdown={project.body_md} className="mt-8" />}
      {project.outcome && (
        <p className="mt-8 rounded-structural border border-[color:var(--color-line)] p-4 text-[color:var(--color-ink)]">
          <span className="font-semibold">Outcome:</span> {project.outcome}
        </p>
      )}
      {project.gallery.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {project.gallery.map((m) => (
            <Img key={m.id} media={m} className="w-full rounded-structural" />
          ))}
        </div>
      )}
    </>
  );
}
