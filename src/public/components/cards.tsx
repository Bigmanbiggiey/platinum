import { Link } from 'react-router-dom';
import { Img } from './ui/Img';
import type { PartnerRow, ServiceRow, TestimonialPublicRow } from '../../shared/supabase/types';
import type { ProjectWithMedia } from '../../shared/content/queries';

export function ServiceCard({ service }: { service: ServiceRow }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="group flex flex-col rounded-lg border border-[color:var(--color-line)] p-5 hover:border-signal"
    >
      {service.category && (
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          {service.category}
        </span>
      )}
      <h3 className="mt-2 text-lg font-bold text-[color:var(--color-ink)]">{service.title}</h3>
      <p className="mt-2 flex-1 text-sm text-[color:var(--color-muted)]">{service.summary}</p>
      <span className="mt-4 text-sm font-semibold text-signal">Learn more →</span>
    </Link>
  );
}

export function ProjectCard({ project }: { project: ProjectWithMedia }) {
  const vehicle = [project.vehicle_make, project.vehicle_model, project.vehicle_year]
    .filter(Boolean)
    .join(' ');
  return (
    <Link
      to={`/portfolio/${project.slug}`}
      className="group overflow-hidden rounded-lg border border-[color:var(--color-line)] hover:border-signal"
    >
      <Img media={project.cover} className="aspect-[4/3] w-full object-cover" />
      <div className="p-5">
        {vehicle && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            {vehicle}
          </span>
        )}
        <h3 className="mt-2 text-lg font-bold text-[color:var(--color-ink)]">{project.title}</h3>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">{project.summary}</p>
      </div>
    </Link>
  );
}

export function TestimonialCard({ t }: { t: TestimonialPublicRow }) {
  return (
    <figure className="rounded-lg border border-[color:var(--color-line)] p-5">
      {t.rating && (
        <div className="text-signal" aria-label={`${t.rating} out of 5`}>
          {'★'.repeat(t.rating)}
          <span className="text-[color:var(--color-line)]">{'★'.repeat(5 - t.rating)}</span>
        </div>
      )}
      <blockquote className="mt-2 text-[color:var(--color-ink)]">“{t.comment}”</blockquote>
      <figcaption className="mt-3 text-sm font-semibold text-[color:var(--color-muted)]">
        {t.first_name} · {t.vehicle_label}
      </figcaption>
    </figure>
  );
}

export function PartnerItem({ partner }: { partner: PartnerRow }) {
  return (
    <li className="rounded-lg border border-[color:var(--color-line)] p-4">
      <p className="font-semibold text-[color:var(--color-ink)]">{partner.name}</p>
      {partner.area && <p className="text-xs text-[color:var(--color-muted)]">{partner.area}</p>}
      {partner.note && (
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">{partner.note}</p>
      )}
    </li>
  );
}
