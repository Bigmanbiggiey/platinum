import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { JobStatus } from '../../lib/jobs';

const mutateAsync = vi.fn();
const job = {
  current: {
    id: 'j1',
    job_number: 'J-001',
    vehicle_label: 'Mazda Demio',
    status: 'checked_in' as JobStatus,
  },
};

vi.mock('../../lib/jobData', () => ({
  useJob: () => ({ isLoading: false, data: job.current }),
  useUpdateJob: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('../../auth/authContext', () => ({ useRole: () => 'staff' }));
vi.mock('./JobHeader', () => ({ JobHeader: () => null }));
vi.mock('./ActivityTab', () => ({ ActivityTab: () => <p>Activity log</p> }));
vi.mock('./WrapUpTab', () => ({ WrapUpTab: () => <p>Wrap-up content</p> }));
vi.mock('./RepairTab', () => ({ RepairTab: () => <p>Repair content</p> }));
vi.mock('./CheckInTab', async () => {
  const { StepDone } = await import('./StepDone');
  return { CheckInTab: () => <StepDone step="check-in" /> };
});
// A step with a field that reports unsaved edits, like the real problem cards.
vi.mock('./DiagnosisTab', async () => {
  const { useState } = await import('react');
  const { useUnsaved } = await import('./stepFlow');
  const { StepDone } = await import('./StepDone');
  return {
    DiagnosisTab: () => {
      const [draft, setDraft] = useState('');
      useUnsaved('draft', draft !== '');
      return (
        <>
          <input aria-label="Draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <StepDone step="diagnosis" />
        </>
      );
    },
  };
});

import { JobDetailPage } from './JobDetailPage';

function renderPage(tab = 'check-in') {
  return render(
    <MemoryRouter
      initialEntries={[`/admin/jobs/j1?tab=${tab}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/admin/jobs/:id" element={<JobDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const selected = () => screen.getByRole('tab', { selected: true }).textContent;
const steps = () => screen.getByRole('navigation', { name: 'Job steps' });

describe('<JobDetailPage /> step flow', () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue(undefined);
    job.current = { ...job.current, status: 'checked_in' };
    localStorage.clear();
    window.scrollTo = vi.fn() as never;
  });

  it('moves between steps with the bar without changing the status', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Diagnosis ›/ }));
    expect(selected()).toBe('Diagnosis');
    await user.click(screen.getByRole('button', { name: /Repair ›/ }));
    expect(selected()).toBe('Repair');
    await user.click(screen.getByRole('button', { name: /‹ Diagnosis/ }));
    expect(selected()).toBe('Diagnosis');
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('Done moves the status forward and goes to the next step', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Done — go to Diagnosis' }));
    expect(mutateAsync).toHaveBeenCalledWith({ status: 'diagnosing' });
    await vi.waitFor(() => expect(selected()).toBe('Diagnosis'));
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('never moves the status backwards', async () => {
    job.current = { ...job.current, status: 'in_repair' };
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Done — go to Diagnosis' }));
    await vi.waitFor(() => expect(selected()).toBe('Diagnosis'));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('stays put and shows the error if the status change fails', async () => {
    mutateAsync.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Done — go to Diagnosis' }));
    expect(await screen.findByText('offline')).toBeInTheDocument();
    expect(selected()).toBe('Check-in');
  });

  it('with auto-advance off, Done updates the status but stays on the step', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = screen.getByRole('switch', { name: /next step when one is done/ });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem('admin.jobs.autoAdvance')).toBe('0');

    await user.click(screen.getByRole('button', { name: 'Done — go to Diagnosis' }));
    expect(mutateAsync).toHaveBeenCalledWith({ status: 'diagnosing' });
    expect(selected()).toBe('Check-in');
    expect(screen.getByRole('status')).toHaveTextContent('Check-in done');
  });

  it('remembers auto-advance off on this device', () => {
    localStorage.setItem('admin.jobs.autoAdvance', '0');
    renderPage();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('asks before leaving a step with unsaved changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderPage('diagnosis');
    await user.type(screen.getByLabelText('Draft'), 'Worn pads');

    await user.click(screen.getByRole('button', { name: /Repair ›/ }));
    expect(confirm).toHaveBeenCalled();
    expect(selected()).toBe('Diagnosis');

    await user.click(screen.getByRole('tab', { name: 'Check-in' }));
    expect(selected()).toBe('Diagnosis');

    await user.click(screen.getByRole('button', { name: 'Done — go to Repair' }));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(selected()).toBe('Diagnosis');

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /Repair ›/ }));
    expect(selected()).toBe('Repair');
    confirm.mockRestore();
  });

  it('has no step bar on the Activity tab', () => {
    renderPage('activity');
    expect(screen.getByText('Activity log')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Job steps' })).not.toBeInTheDocument();
  });

  it('ends at Wrap-up, with no Done button there', () => {
    renderPage('wrap-up');
    expect(steps()).toHaveTextContent('Step 4 of 4');
    expect(screen.queryByRole('button', { name: /Done —/ })).not.toBeInTheDocument();
  });
});
