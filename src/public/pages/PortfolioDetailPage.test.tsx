import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PortfolioDetailPage } from './PortfolioDetailPage';
import { ProjectCard } from '../components/cards';
import type { ProjectWithMedia } from '../../shared/content/queries';
import type { JobPublic } from '../../shared/jobs/publicTimeline';

vi.mock('../components/ui/SeoHead', () => ({ SeoHead: () => null }));
// The data router trips over jsdom's AbortSignal; feed the loader data directly instead.
const loaderData = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useLoaderData: () => loaderData.current,
}));

const project: ProjectWithMedia = {
  id: 'p1',
  slug: '2014-toyota-fielder-brakes-0042',
  title: 'Brakes — 2014 Toyota Fielder',
  category: null,
  vehicle_make: 'Toyota',
  vehicle_model: 'Fielder',
  vehicle_year: 2014,
  summary: 'Squeal when braking',
  body_md: 'Manual body that must not show for a job entry',
  outcome: null,
  service_id: null,
  project_date: '2026-10-02',
  cover_media_id: null,
  is_published: true,
  display_order: 100,
  job_id: 'j1',
  cover: null,
  gallery: [],
};

const job: JobPublic = {
  job_id: 'j1',
  job_number: 'PP-2026-0042',
  portfolio_slug: project.slug,
  vehicle_label: '2014 Toyota Fielder',
  service_id: null,
  service_title: 'Brakes',
  booked_at: null,
  checked_in_at: '2026-10-01T08:00:00Z',
  completed_at: '2026-10-02T15:00:00Z',
  complaint: 'Squeal when braking',
  findings: [],
  general_photos: [],
};

describe('portfolio — documented jobs', () => {
  it('tags job entries on the card', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProjectCard project={project} />
        <ProjectCard project={{ ...project, id: 'p2', job_id: null }} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Documented job')).toHaveLength(1);
  });

  it('renders the timeline instead of the manual body for a job entry', () => {
    loaderData.current = { project, job };
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PortfolioDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Job PP-2026-0042')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.queryByText(/Manual body/)).not.toBeInTheDocument();
  });

  it('keeps the manual body for an entry with no job', () => {
    loaderData.current = { project: { ...project, job_id: null }, job: null };
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PortfolioDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Manual body/)).toBeInTheDocument();
  });
});
