import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobAgendaList } from './JobAgenda';
import type { AgendaJob } from '../../lib/jobs';

const jobs: AgendaJob[] = [
  {
    id: 'j2',
    job_number: 'PP-2026-0043',
    vehicle_label: '2015 Mazda Demio',
    status: 'checked_in',
    booked_at: '2026-10-02T06:00:00+00:00',
  },
  {
    id: 'j1',
    job_number: 'PP-2026-0042',
    vehicle_label: '2014 Toyota Fielder',
    status: 'in_repair',
    booked_at: '2026-10-01T06:00:00+00:00',
  },
];

describe('<JobAgendaList />', () => {
  it('lists booked jobs by day with number, vehicle and status — no customer data', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <JobAgendaList jobs={jobs} />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/admin/jobs/j1', '/admin/jobs/j2']);
    expect(screen.getByText('PP-2026-0042')).toBeInTheDocument();
    expect(screen.getByText('2014 Toyota Fielder')).toBeInTheDocument();
    expect(screen.getByText('In repair')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });
});
