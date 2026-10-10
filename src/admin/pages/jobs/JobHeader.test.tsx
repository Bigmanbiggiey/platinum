import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../auth/authContext';
import { JobHeader } from './JobHeader';
import type { JobWithRefs } from '../../lib/jobs';

const assign = vi.fn();
const unassign = vi.fn();
const createClient = vi.fn();
vi.mock('../../lib/jobData', () => {
  const m = (mutate = vi.fn()) => ({ mutate, isPending: false, isError: false, error: null });
  return {
    useUpdateJob: () => m(),
    useLinkJobClient: () => m(),
    useJobAssignees: () => ({
      data: [{ job_id: 'j1', user_id: 's1', display_name: 'Kevin', assigned_at: '' }],
    }),
    useAssignablePeople: () => ({
      data: [
        { user_id: 's1', display_name: 'Kevin', email: 'k@x.co', role: 'staff' },
        { user_id: 's2', display_name: 'Ann', email: 'a@x.co', role: 'staff' },
      ],
    }),
    useAssignJob: () => m(assign),
    useUnassignJob: () => m(unassign),
    useCreateClientForJob: () => m(createClient),
  };
});
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
  review_note: null,
  submitted_at: null,
  created_by: null,
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

  it('owner assigns and removes people; staff only see who is on the job', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAs('owner');
    expect(screen.getByText('Kevin')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Assign someone'), 's2');
    await user.click(screen.getByRole('button', { name: 'Assign' }));
    expect(assign).toHaveBeenCalledWith('s2');
    await user.click(screen.getByRole('button', { name: 'Remove Kevin' }));
    expect(unassign).toHaveBeenCalledWith('s1');
    unmount();

    renderAs('staff', { ...job, client: null });
    expect(screen.getByText('Kevin')).toBeInTheDocument();
    expect(screen.queryByLabelText('Assign someone')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Kevin' })).not.toBeInTheDocument();
  });

  it('owner creates a client from a walk-in; the check-in vehicle is shown', async () => {
    const user = userEvent.setup();
    renderAs('owner', { ...job, client_id: null, client: null, service_request_id: null });
    await user.click(screen.getByRole('button', { name: 'New client' }));
    expect(screen.getByText(/2014 Toyota Fielder · KDA 123A/)).toBeInTheDocument();
    const create = screen.getByRole('button', { name: 'Create client' });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText('Client name'), ' Jane Wanjiku ');
    await user.type(screen.getByLabelText('Client phone'), '0722 000000');
    await user.click(create);
    expect(createClient).toHaveBeenCalledWith({
      name: 'Jane Wanjiku',
      phone: '0722 000000',
      email: null,
    });
  });
});
