import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WalkInForm } from './WalkInForm';

const createVehicle = vi.fn();
const createJob = vi.fn();
vi.mock('../../lib/resources', () => ({
  vehicles: {
    useCreate: () => ({ mutateAsync: createVehicle, isPending: false }),
  },
}));
vi.mock('../../lib/jobData', () => ({
  useCreateJob: () => ({ mutateAsync: createJob, isPending: false }),
}));

function renderForm() {
  return render(
    <MemoryRouter
      initialEntries={['/admin/jobs/new']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/admin/jobs/new" element={<WalkInForm />} />
        <Route path="/admin/jobs/:id" element={<p>Job page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('<WalkInForm />', () => {
  beforeEach(() => {
    createVehicle.mockReset().mockResolvedValue({
      id: 'v1',
      client_id: null,
      make: 'Mazda',
      model: 'Demio',
      year: 2015,
      registration: 'KDC 1',
    });
    createJob.mockReset().mockResolvedValue('j1');
  });

  it('has no client picker', () => {
    renderForm();
    expect(screen.queryByText(/client/i)).not.toBeInTheDocument();
  });

  it('checks in a walk-in from vehicle details alone', async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = screen.getByRole('button', { name: 'Check in vehicle' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Make'), ' Mazda ');
    await user.type(screen.getByLabelText('Model'), 'Demio');
    await user.type(screen.getByLabelText('Year'), '2015');
    await user.type(screen.getByLabelText('Registration'), 'KDC 1');
    await user.type(screen.getByLabelText(/complaint/i), 'Knocking on bumps');
    await user.click(submit);

    expect(createVehicle).toHaveBeenCalledWith({
      client_id: null,
      make: 'Mazda',
      model: 'Demio',
      year: 2015,
      registration: 'KDC 1',
    });
    expect(createJob).toHaveBeenCalledWith({
      vehicle_id: 'v1',
      vehicle_label: '2015 Mazda Demio',
      complaint: 'Knocking on bumps',
    });
    expect(await screen.findByText('Job page')).toBeInTheDocument();
  });

  it('reuses the vehicle if only the job insert failed', async () => {
    createJob.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce('j1');
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Make'), 'Mazda');
    await user.click(screen.getByRole('button', { name: 'Check in vehicle' }));
    expect(await screen.findByText('network')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check in vehicle' }));
    expect(await screen.findByText('Job page')).toBeInTheDocument();
    expect(createVehicle).toHaveBeenCalledTimes(1);
  });
});
