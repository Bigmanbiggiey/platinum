import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../auth/authContext';
import { JobHeader } from './JobHeader';
import type { JobWithRefs } from '../../lib/jobs';

vi.mock('../../lib/jobData', () => ({
  useUpdateJob: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useLinkJobClient: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../../lib/resources', () => ({
  clients: { useList: () => ({ data: [{ id: 'c1', name: 'Jane Wanjiku', phone: null }] }) },
}));

const job: JobWithRefs = {
  id: 'j1',
  job_number: 'PP-2026-0042',
  client_id: 'c1',
  vehicle_id: 'v1',
  vehicle_label: '2014 Toyota Fielder',
  service_request_id: 'r1',
  service_id: null,
  status: 'in_repair',
  booked_at: null,
  checked_in_at: '2026-09-30T08:00:00Z',
  completed_at: null,
  odometer_km: null,
  complaint: null,
  public_consent: false,
  consent_recorded_at: null,
  labour_hours: null,
  internal_notes: null,
  created_at: '2026-09-30T08:00:00Z',
  updated_at: '2026-09-30T08:00:00Z',
  client: { name: 'Jane Wanjiku' },
  vehicle: { registration: 'KDA 123A' },
  job_cost: null,
};

function renderAs(role: 'owner' | 'staff', j: JobWithRefs = job) {
  const state: AuthState = {
    loading: false,
    session: null,
    profile: { user_id: 'u1', email: 'x@y.co', display_name: 'X', role, is_active: true },
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <JobHeader job={j} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<JobHeader />', () => {
  it('shows the owner the client and every status', () => {
    renderAs('owner');
    expect(screen.getByRole('link', { name: 'Jane Wanjiku' })).toBeInTheDocument();
    const status = screen.getByLabelText('Status');
    expect(within(status).getByRole('option', { name: 'Cancelled' })).toBeInTheDocument();
  });

  it('hides the client from staff and never offers Cancelled', () => {
    renderAs('staff', { ...job, client: null });
    expect(screen.queryByText('Client')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane Wanjiku')).not.toBeInTheDocument();
    expect(screen.getByText('KDA 123A')).toBeInTheDocument();
    const status = screen.getByLabelText('Status');
    expect(within(status).queryByRole('option', { name: 'Cancelled' })).not.toBeInTheDocument();
  });

  it('lets the owner link a client to a walk-in', () => {
    renderAs('owner', { ...job, client_id: null, client: null, service_request_id: null });
    expect(screen.getByText(/walk-in/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Link a client')).toBeInTheDocument();
  });
});
