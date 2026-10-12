import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { trigger, triggerNow, update, live } = vi.hoisted(() => ({
  trigger: vi.fn(),
  triggerNow: vi.fn(),
  update: vi.fn(async () => undefined),
  live: { current: true },
}));

const rows = [
  {
    id: 't1',
    first_name: 'Amina',
    vehicle_label: '2014 Toyota Fielder',
    rating: 5,
    comment: 'Brakes are silent now',
    consent: true,
    source: 'review_link',
    status: 'pending',
    is_featured: false,
    submitted_at: '2026-10-12T00:00:00Z',
    job_id: 'j1',
    job: { job_number: 'PP-2026-0001' },
  },
  {
    id: 't2',
    first_name: 'Brian',
    vehicle_label: 'Mazda Demio',
    rating: null,
    comment: 'Good service',
    consent: true,
    source: 'public_form',
    status: 'pending',
    is_featured: false,
    submitted_at: '2026-10-11T00:00:00Z',
    job_id: null,
    job: null,
  },
];

vi.mock('../../lib/resources', () => ({
  testimonials: {
    useList: () => ({ data: rows, isLoading: false }),
    useUpdate: () => ({ mutateAsync: update }),
    useRemove: () => ({ mutateAsync: vi.fn() }),
  },
}));
vi.mock('../../lib/rebuild', () => ({
  usePublish: () => ({ trigger, triggerNow, message: '' }),
}));
vi.mock('../../lib/publishJob', () => ({ isOnWebsite: vi.fn(async () => live.current) }));
vi.mock('./ContentBackLink', () => ({ ContentBackLink: () => null }));

import { TestimonialsPage } from './TestimonialsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <TestimonialsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  trigger.mockClear();
  triggerNow.mockClear();
  update.mockClear();
  live.current = true;
});

describe('<TestimonialsPage /> (J3)', () => {
  it('shows where each testimonial came from and links reviews to their job', () => {
    renderPage();
    expect(screen.getByText('Review link')).toBeInTheDocument();
    expect(screen.getByText('Website form')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PP-2026-0001' })).toHaveAttribute(
      'href',
      '/admin/jobs/j1?tab=wrap-up',
    );
  });

  it('approving a review of a job on the website rebuilds at once', async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0]);
    await waitFor(() => expect(triggerNow).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({ id: 't1', patch: { status: 'approved' } });
    expect(trigger).not.toHaveBeenCalled();
  });

  it('other testimonials use the batched rebuild', async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[1]);
    await waitFor(() => expect(trigger).toHaveBeenCalled());
    expect(triggerNow).not.toHaveBeenCalled();
  });
});
