import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../auth/authContext';
import { JobsPage } from './JobsPage';

const job = (id: string, label: string, status: string, created_by: string | null) => ({
  id,
  job_number: `PP-2026-${id}`,
  vehicle_label: label,
  status,
  created_by,
  checked_in_at: '2026-10-01T08:00:00Z',
  client: null,
  vehicle: null,
});

vi.mock('../../lib/jobData', () => ({
  useJobs: () => ({
    isLoading: false,
    isError: false,
    data: [
      job('0001', 'Toyota Fielder', 'in_repair', 'someone'),
      job('0002', 'Mazda Demio', 'checked_in', 'me'),
      job('0003', 'Nissan Note', 'diagnosing', 'someone'),
      job('0004', 'Honda Fit', 'awaiting_review', 'someone'),
    ],
  }),
  useMyAssignedJobIds: () => ({ data: new Set(['0003']) }),
}));

function renderAs(role: 'owner' | 'staff') {
  const state: AuthState = {
    loading: false,
    session: null,
    profile: { user_id: 'me', email: 'x@y.co', display_name: 'X', role, is_active: true },
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <JobsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<JobsPage />', () => {
  it('staff: my jobs (assigned or checked in by me) first, then the others', () => {
    renderAs('staff');
    const mine = screen.getByRole('heading', { name: 'My jobs' }).parentElement!;
    const others = screen.getByRole('heading', { name: 'Other jobs' }).parentElement!;
    expect(within(mine).getByText('Mazda Demio')).toBeInTheDocument();
    expect(within(mine).getByText('Nissan Note')).toBeInTheDocument();
    expect(within(others).getByText('Toyota Fielder')).toBeInTheDocument();
    expect(within(others).getByText('Honda Fit')).toBeInTheDocument();
  });

  it('owner: one list, with a To review filter and count', async () => {
    const user = userEvent.setup();
    renderAs('owner');
    expect(screen.queryByRole('heading', { name: 'My jobs' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'To review (1)' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Show'), 'review');
    expect(screen.getByText('Honda Fit')).toBeInTheDocument();
    expect(screen.queryByText('Toyota Fielder')).not.toBeInTheDocument();
  });
});
