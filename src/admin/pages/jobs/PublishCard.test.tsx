import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublishCard } from './PublishCard';
import type { JobWithRefs } from '../../lib/jobs';

const publish = vi.fn();
const unpublish = vi.fn();
const trigger = vi.fn();
const project = vi.hoisted(() => ({
  current: null as null | {
    id: string;
    slug: string;
    title: string;
    summary: string;
    is_published: boolean;
  },
}));

vi.mock('../../lib/jobData', () => ({
  findings: {
    useList: () => ({
      data: [
        {
          id: 'f1',
          title: 'Worn pads',
          diagnosis: 'Pads at 1 mm',
          fix: 'Replaced pads',
          outcome: 'fixed',
          display_order: 1,
          created_at: '2026-10-01T08:00:00Z',
        },
      ],
    }),
  },
  parts: { useList: () => ({ data: [] }) },
  photos: {
    useList: () => ({
      data: [
        {
          media_id: 'm-after',
          finding_id: 'f1',
          stage: 'repair',
          caption: null,
          is_public: true,
          display_order: 1,
          created_at: '2026-10-01T08:00:00Z',
          media: { storage_path: 'p/after.jpg', alt_text: 'after photo' },
        },
        {
          media_id: 'm-plate',
          finding_id: 'f1',
          stage: 'repair',
          caption: null,
          is_public: false,
          display_order: 2,
          created_at: '2026-10-01T08:00:00Z',
          media: { storage_path: 'p/plate.jpg', alt_text: 'plate photo' },
        },
      ],
    }),
  },
}));
vi.mock('../../lib/resources', () => ({
  services: { useOne: () => ({ data: { title: 'Brake overhaul' } }) },
  vehicles: { useOne: () => ({ data: { make: 'Toyota', model: 'Fielder', year: 2014 } }) },
}));
vi.mock('../../lib/rebuild', () => ({
  usePublish: () => ({ trigger: vi.fn(), triggerNow: trigger, message: '' }),
}));
vi.mock('../../lib/publishJob', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/publishJob')>()),
  usePublishedProject: () => ({ data: project.current }),
  usePublishJob: () => ({ mutate: publish, isPending: false, error: null }),
  useUnpublishJob: () => ({ mutate: unpublish, isPending: false, error: null }),
}));

const job = {
  id: 'j1',
  job_number: 'PP-2026-0042',
  vehicle_label: '2014 Toyota Fielder',
  vehicle_id: 'v1',
  service_id: 's1',
  status: 'completed',
  public_consent: true,
  booked_at: null,
  checked_in_at: '2026-10-01T08:00:00Z',
  completed_at: '2026-10-02T15:00:00Z',
  complaint: 'Squeal when braking\nworse in the rain',
} as unknown as JobWithRefs;

describe('<PublishCard />', () => {
  beforeEach(() => {
    publish.mockReset();
    unpublish.mockReset();
    project.current = null;
  });

  it('explains why a job can’t be published yet', () => {
    render(<PublishCard job={{ ...job, status: 'in_repair', public_consent: false }} />);
    expect(screen.getByText(/isn’t completed/)).toBeInTheDocument();
    expect(screen.getByText(/hasn’t agreed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish to website' })).not.toBeInTheDocument();
  });

  it('publishes with sensible defaults, a stable slug and the after photo as cover', async () => {
    const user = userEvent.setup();
    render(<PublishCard job={job} />);
    expect(screen.getByDisplayValue('Brake overhaul — 2014 Toyota Fielder')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Squeal when braking')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publish to website' }));
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        existingId: null,
        slug: '2014-toyota-fielder-brake-overhaul-0042',
        title: 'Brake overhaul — 2014 Toyota Fielder',
        coverMediaId: 'm-after',
        vehicle: { make: 'Toyota', model: 'Fielder', year: 2014 },
      }),
      expect.anything(),
    );
  });

  it('previews without hidden photos', async () => {
    const user = userEvent.setup();
    render(<PublishCard job={job} />);
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByAltText('after photo')).toBeInTheDocument();
    expect(screen.queryByAltText('plate photo')).not.toBeInTheDocument();
  });

  it('when live: links to the page, updates and unpublishes', async () => {
    project.current = {
      id: 'p1',
      slug: 'kept-slug-0042',
      title: 'Saved title',
      summary: 'Saved summary',
      is_published: true,
    };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<PublishCard job={job} />);
    expect(screen.getByRole('link', { name: '/portfolio/kept-slug-0042' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Update website' }));
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ existingId: 'p1', slug: 'kept-slug-0042', title: 'Saved title' }),
      expect.anything(),
    );
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(unpublish).toHaveBeenCalledWith('p1', expect.anything());
  });
});
