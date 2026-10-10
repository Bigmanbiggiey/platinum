import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../auth/authContext';
import { WrapUpTab } from './WrapUpTab';
import type { JobWithRefs } from '../../lib/jobs';

const saveLabour = vi.fn();
vi.mock('../../lib/jobData', () => {
  const list = () => ({ data: [] });
  const mutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  });
  return {
    findings: { useList: list },
    parts: { useList: list, useRemove: mutation },
    photos: { useList: list },
    useAddPart: mutation,
    useSaveLabour: () => ({ mutate: saveLabour, isPending: false, isError: false, error: null }),
    useUpdateJob: mutation,
    useDeleteJob: mutation,
  };
});
vi.mock('./usePhotoActions', () => ({
  usePhotoActions: () => ({
    upload: vi.fn(),
    togglePublic: vi.fn(),
    remove: vi.fn(),
    uploading: false,
    error: null,
  }),
}));

const job: JobWithRefs = {
  id: 'j1',
  job_number: 'PP-2026-0042',
  client_id: null,
  vehicle_id: 'v1',
  vehicle_label: '2014 Toyota Fielder',
  service_request_id: null,
  service_id: null,
  status: 'in_repair',
  booked_at: null,
  checked_in_at: '2026-09-30T08:00:00Z',
  completed_at: null,
  odometer_km: null,
  complaint: null,
  public_consent: false,
  consent_recorded_at: null,
  labour_hours: 2,
  internal_notes: null,
  review_note: null,
  submitted_at: null,
  created_by: null,
  created_at: '2026-09-30T08:00:00Z',
  updated_at: '2026-09-30T08:00:00Z',
  client: null,
  vehicle: { registration: null },
  job_cost: { labour_cost_kes: 4000 },
};

function renderAs(role: 'owner' | 'staff') {
  const state: AuthState = {
    loading: false,
    session: null,
    profile: { user_id: 'u1', email: 'x@y.co', display_name: 'X', role, is_active: true },
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WrapUpTab job={job} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<WrapUpTab />', () => {
  beforeEach(() => saveLabour.mockReset());

  it('staff: labour hours and completion only — no costs, cancel or delete', async () => {
    const user = userEvent.setup();
    renderAs('staff');
    expect(screen.getByLabelText('Labour hours')).toHaveValue(2);
    expect(screen.queryByLabelText('Labour cost (KES)')).not.toBeInTheDocument();
    expect(screen.queryByText(/cost summary/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel job' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete job' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save labour' }));
    expect(saveLabour).toHaveBeenCalledWith({ hours: 2 });
  });

  it('owner: sees and saves the labour cost, cost summary, cancel and delete', async () => {
    const user = userEvent.setup();
    renderAs('owner');
    expect(screen.getByLabelText('Labour cost (KES)')).toHaveValue(4000);
    expect(screen.getByText(/cost summary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete job' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save labour' }));
    expect(saveLabour).toHaveBeenCalledWith({ hours: 2, costKes: 4000 });
  });
});
