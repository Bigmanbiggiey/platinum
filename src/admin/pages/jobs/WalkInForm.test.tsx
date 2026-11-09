import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WalkInForm } from './WalkInForm';

const createVehicle = vi.fn();
const createJob = vi.fn();
const addPhotos = vi.fn();
vi.mock('../../lib/resources', () => ({
  vehicles: {
    useCreate: () => ({ mutateAsync: createVehicle, isPending: false }),
  },
}));
vi.mock('../../lib/jobData', () => ({
  useCreateJob: () => ({ mutateAsync: createJob, isPending: false }),
  useAddCheckInPhotos: () => ({ mutateAsync: addPhotos, isPending: false }),
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
    addPhotos.mockReset().mockResolvedValue({ failed: 0 });
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

  it('uploads check-in photos once the job exists', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Make'), 'Mazda');
    const a = new File(['a'], 'front.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'rear.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Add check-in photos'), [a, b]);
    await user.click(screen.getByRole('button', { name: 'Remove check-in photo 1' }));
    expect(addPhotos).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Check in vehicle' }));
    expect(await screen.findByText('Job page')).toBeInTheDocument();
    expect(addPhotos).toHaveBeenCalledWith({
      jobId: 'j1',
      vehicleLabel: '2015 Mazda Demio',
      files: [b],
    });
    expect(createJob.mock.invocationCallOrder[0]).toBeLessThan(
      addPhotos.mock.invocationCallOrder[0],
    );
  });

  it('still opens the job when some photos fail, and says so', async () => {
    addPhotos.mockResolvedValue({ failed: 1 });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Make'), 'Mazda');
    await user.upload(
      screen.getByLabelText('Add check-in photos'),
      new File(['a'], 'front.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Check in vehicle' }));
    expect(await screen.findByText('Job page')).toBeInTheDocument();
    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/1 check-in photo/));
    expect(createJob).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('skips the photo upload when none were added', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Make'), 'Mazda');
    await user.click(screen.getByRole('button', { name: 'Check in vehicle' }));
    expect(await screen.findByText('Job page')).toBeInTheDocument();
    expect(addPhotos).not.toHaveBeenCalled();
  });
});
