import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { JobTimeline } from './JobTimeline';
import type { JobPublic, PublicPhoto } from '../../shared/jobs/publicTimeline';

const photo = (id: string): PublicPhoto => ({
  id,
  storage_path: `p/${id}.jpg`,
  alt_text: `${id} photo`,
  caption: null,
  width: null,
  height: null,
});

const job: JobPublic = {
  job_id: 'j1',
  job_number: 'PP-2026-0042',
  portfolio_slug: '2014-toyota-fielder-brakes-0042',
  vehicle_label: '2014 Toyota Fielder',
  service_id: null,
  service_title: 'Brakes',
  booked_at: null,
  checked_in_at: '2026-10-01T08:00:00Z',
  completed_at: '2026-10-02T15:00:00Z',
  complaint: 'Squeal when braking',
  findings: [
    {
      title: 'Worn pads',
      diagnosis: 'Pads at 1 mm',
      fix: 'Replaced front pads',
      outcome: 'fixed',
      parts: ['Brake pads', 'Brake cleaner'],
      before: [photo('before')],
      after: [photo('after')],
    },
    {
      title: 'Tired shocks',
      diagnosis: 'Leaking rear shocks',
      fix: null,
      outcome: 'deferred',
      parts: [],
      before: [photo('shock')],
      after: [],
    },
  ],
  general_photos: [photo('arrival')],
};

describe('<JobTimeline />', () => {
  it('walks through check-in, diagnosis, repair and completion', () => {
    render(<JobTimeline job={job} />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Checked in',
      'Diagnosis',
      'Repair',
      'Completed',
    ]);
    expect(screen.getByText(/Squeal when braking/)).toBeInTheDocument();
    expect(screen.getByText('Brake pads · Brake cleaner')).toBeInTheDocument();
  });

  it('labels a deferred problem and pairs before/after photos once', () => {
    render(<JobTimeline job={job} />);
    expect(screen.getByText('Recommended — not done at client’s request')).toBeInTheDocument();
    // Each photo appears exactly once (no duplicate "before" under Diagnosis and Repair).
    for (const alt of ['before photo', 'after photo', 'shock photo', 'arrival photo']) {
      expect(screen.getAllByAltText(alt)).toHaveLength(1);
    }
    const repair = screen.getByRole('heading', { name: 'Repair' }).closest('li')!;
    expect(within(repair).getByAltText('before photo')).toBeInTheDocument();
    expect(within(repair).getByAltText('after photo')).toBeInTheDocument();
  });
});
