import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivityList } from './ActivityList';
import type { JobActivityWithJob } from '../lib/activity';

const now = new Date('2026-10-01T10:00:00Z');
const entry: JobActivityWithJob = {
  id: 'a1',
  job_id: 'j1',
  created_at: '2026-10-01T09:50:00Z',
  actor_id: 'u1',
  actor_name: 'Kevin',
  actor_role: 'staff',
  action: 'photo_added',
  detail: { stage: 'repair', count: 2 },
  job: { job_number: 'PP-2026-0042', vehicle_label: '2014 Toyota Fielder' },
};

function renderList(props: Parameters<typeof ActivityList>[0]) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ActivityList {...props} />
    </MemoryRouter>,
  );
}

describe('<ActivityList />', () => {
  it('dashboard feed: who, what, which job, when — linking to the job', () => {
    renderList({ items: [entry], showJob: true, now });
    expect(screen.getByText('Kevin · staff')).toBeInTheDocument();
    expect(screen.getByText(/added 2 after photos/)).toBeInTheDocument();
    expect(screen.getByText(/PP-2026-0042 · 2014 Toyota Fielder/)).toBeInTheDocument();
    expect(screen.getByText('10 min ago')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/jobs/j1');
  });

  it('job timeline: no job reference and no links', () => {
    renderList({ items: [entry], now });
    expect(screen.queryByText(/PP-2026-0042/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says so when there is nothing yet', () => {
    renderList({ items: [] });
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });
});
