import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JobFinding, JobWithRefs } from '../../lib/jobs';
import { StepFlowContext, type StepFlow } from './stepFlow';

let rows: Partial<JobFinding>[] = [];
const updateFinding = vi.fn();

vi.mock('../../lib/jobFlow', async (orig) => ({
  ...(await orig<typeof import('../../lib/jobFlow')>()),
  AUTO_ADVANCE_MS: 300,
}));
vi.mock('../../auth/authContext', () => ({ useRole: () => 'staff' }));
vi.mock('./usePhotoActions', () => ({
  usePhotoActions: () => ({
    upload: vi.fn(),
    togglePublic: vi.fn(),
    remove: vi.fn(),
    error: null,
    notice: '',
  }),
}));
vi.mock('../../lib/jobData', () => ({
  findings: {
    useList: () => ({ isLoading: false, data: rows }),
    useUpdate: () => ({ mutate: updateFinding, isPending: false, isError: false }),
  },
  photos: { useList: () => ({ data: [] }) },
  parts: {
    useList: () => ({ data: [] }),
    useRemove: () => ({ mutate: vi.fn(), isError: false }),
  },
  useAddPart: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}));

import { RepairTab } from './RepairTab';

const finding = (over: Partial<JobFinding>): Partial<JobFinding> => ({
  id: 'f1',
  title: 'Worn pads',
  diagnosis: null,
  fix: null,
  outcome: 'pending',
  ...over,
});

function renderTab(autoAdvance = true) {
  const flow: StepFlow = {
    goTo: vi.fn(() => true),
    finish: vi.fn(async () => true),
    finishing: false,
    autoAdvance,
    setAutoAdvance: vi.fn(),
    markUnsaved: vi.fn(),
  };
  const job = { id: 'j1', vehicle_label: 'Mazda Demio' } as JobWithRefs;
  render(
    <StepFlowContext.Provider value={flow}>
      <RepairTab job={job} />
    </StepFlowContext.Provider>,
  );
  return flow;
}

/** Saving marks the finding fixed in the "database", like the refetch would. */
function saveSetsOutcome() {
  updateFinding.mockImplementation(
    (v: { id: string; patch: Partial<JobFinding> }, o: { onSuccess: () => void }) => {
      rows = rows.map((r) => (r.id === v.id ? { ...r, ...v.patch } : r));
      o.onSuccess();
    },
  );
}

async function fixFirstProblem(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getAllByLabelText('Outcome')[0], 'fixed');
  await user.click(screen.getAllByRole('button', { name: 'Save repair' })[0]);
}

describe('<RepairTab /> step flow', () => {
  beforeEach(() => {
    rows = [finding({})];
    updateFinding.mockReset();
    saveSetsOutcome();
  });

  it('goes to Wrap-up on its own once the last problem gets an outcome', async () => {
    const user = userEvent.setup();
    const flow = renderTab();
    expect(screen.getByRole('button', { name: 'Done — go to Wrap-up' })).toBeDisabled();
    await fixFirstProblem(user);
    expect(screen.getByRole('status')).toHaveTextContent('going to Wrap-up');
    await vi.waitFor(() => expect(flow.finish).toHaveBeenCalledWith('repair'));
  });

  it('"Stay here" cancels the move', async () => {
    const user = userEvent.setup();
    const flow = renderTab();
    await fixFirstProblem(user);
    await user.click(screen.getByRole('button', { name: 'Stay here' }));
    await new Promise((r) => setTimeout(r, 400));
    expect(flow.finish).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Done — go to Wrap-up' })).toBeEnabled();
  });

  it('waits while any problem is still pending', async () => {
    rows = [finding({}), finding({ id: 'f2', title: 'Loose belt' })];
    const user = userEvent.setup();
    const flow = renderTab();
    await fixFirstProblem(user);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(flow.finish).not.toHaveBeenCalled();
  });

  it('with auto-advance off, only the Done button moves on', async () => {
    const user = userEvent.setup();
    const flow = renderTab(false);
    await fixFirstProblem(user);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done — go to Wrap-up' }));
    expect(flow.finish).toHaveBeenCalledWith('repair', { saved: undefined });
  });

  it('reports unsaved repair edits to the job page', async () => {
    const user = userEvent.setup();
    const flow = renderTab();
    await user.type(screen.getAllByRole('textbox')[0], 'New pads');
    expect(flow.markUnsaved).toHaveBeenLastCalledWith('repair:f1', true);
  });
});
