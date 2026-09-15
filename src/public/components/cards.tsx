import { Link } from 'react-router-dom';
import { Img } from './ui/Img';
import type { PartnerRow, ServiceRow, TestimonialPublicRow } from '../../shared/supabase/types';
import type { ProjectWithMedia } from '../../shared/content/queries';

const FIELD_LABEL_CLASS =
  'font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]';

export function ServiceCard({ service }: { service: ServiceRow }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="group flex flex-col gap-1 rounded-structural border border-[color:var(--color-line)] p-5 hover:border-signal"
    >
      {service.category && (
        <p className={FIELD_LABEL_CLASS}>
          CATEGORY <span className="text-[color:var(--color-ink)]">{service.category}</span>
        </p>
      )}
      <h3 className="mt-1 text-lg font-bold text-[color:var(--color-ink)] group-hover:text-signal">
        {service.title}
      </h3>
      <p className="flex-1 text-sm text-[color:var(--color-muted)]">{service.summary}</p>
    </Link>
  );
}

export function ProjectCard({ project }: { project: ProjectWithMedia }) {
  return (
    <Link
      to={`/portfolio/${project.slug}`}
      className="group overflow-hidden rounded-structural border border-[color:var(--color-line)] hover:border-signal"
    >
      <Img media={project.cover} className="aspect-[4/3] w-full object-cover" />
      <div className="p-5">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(project.vehicle_make || project.vehicle_model) && (
            <p className={FIELD_LABEL_CLASS}>
              VEHICLE{' '}
              <span className="text-[color:var(--color-ink)]">
                {[project.vehicle_make, project.vehicle_model].filter(Boolean).join(' ')}
              </span>
            </p>
          )}
          {project.vehicle_year && (
            <p className={FIELD_LABEL_CLASS}>
              YEAR <span className="text-[color:var(--color-ink)]">{project.vehicle_year}</span>
            </p>
          )}
        </div>
        <h3 className="mt-2 text-lg font-bold text-[color:var(--color-ink)]">{project.title}</h3>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">{project.summary}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-ink)]">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" />
          Completed
        </p>
      </div>
    </Link>
  );
}

export function TestimonialCard({ t }: { t: TestimonialPublicRow }) {
  return (
    <figure>
      <blockquote className="text-lg leading-snug text-[color:var(--color-ink)]">
        “{t.comment}”
      </blockquote>
      <figcaption className="mt-3 flex items-center gap-2 text-sm text-[color:var(--color-muted)]">
        <span className="font-semibold">
          {t.first_name} · {t.vehicle_label}
        </span>
        {t.rating && (
          <span className="text-signal" aria-label={`${t.rating} out of 5`}>
            {'★'.repeat(t.rating)}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export function PartnerItem({ partner }: { partner: PartnerRow }) {
  return (
    <li className="rounded-structural border border-[color:var(--color-line)] p-4">
      <p className="font-semibold text-[color:var(--color-ink)]">{partner.name}</p>
      {partner.area && <p className="text-xs text-[color:var(--color-muted)]">{partner.area}</p>}
      {partner.note && (
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">{partner.note}</p>
      )}
    </li>
  );
}
