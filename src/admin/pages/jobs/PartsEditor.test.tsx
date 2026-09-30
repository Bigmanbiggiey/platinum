import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartsEditor } from './PartsEditor';
import type { JobPart } from '../../lib/jobs';

const part: JobPart = {
  id: 'p1',
  job_id: 'j1',
  finding_id: 'f1',
  name: 'Oil filter',
  quantity: 1,
  cost_kes: 800,
  created_at: '2026-09-30T08:00:00Z',
};

describe('<PartsEditor />', () => {
  it('adds a part with quantity and cost as numbers, then clears the row', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<PartsEditor parts={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    const add = screen.getByRole('button', { name: 'Add part' });
    expect(add).toBeDisabled();

    await user.type(screen.getByLabelText('Part name'), '  Brake fluid ');
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '1.5');
    await user.type(screen.getByLabelText('Cost (KES)'), '1200');
    await user.click(add);

    expect(onAdd).toHaveBeenCalledWith({ name: 'Brake fluid', quantity: 1.5, cost_kes: 1200 });
    expect(screen.getByLabelText('Part name')).toHaveValue('');
    expect(screen.getByLabelText('Quantity')).toHaveValue(1);
  });

  it('sends a null cost when none is entered', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<PartsEditor parts={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    await user.type(screen.getByLabelText('Part name'), 'Cable ties');
    await user.click(screen.getByRole('button', { name: 'Add part' }));
    expect(onAdd).toHaveBeenCalledWith({ name: 'Cable ties', quantity: 1, cost_kes: null });
  });

  it('lists parts with private quantity and cost, and removes one', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<PartsEditor parts={[part]} onAdd={vi.fn()} onRemove={onRemove} />);
    expect(screen.getByText('Oil filter')).toBeInTheDocument();
    expect(screen.getByText('×1')).toBeInTheDocument();
    expect(screen.getByText('KES 800')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Oil filter' }));
    expect(onRemove).toHaveBeenCalledWith('p1');
  });

  it('keeps the row when onAdd rejects, and only clears it once onAdd resolves', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce(undefined);
    render(<PartsEditor parts={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    await user.type(screen.getByLabelText('Part name'), 'Spark plug');
    await user.click(screen.getByRole('button', { name: 'Add part' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Part name')).toHaveValue('Spark plug');

    await user.click(screen.getByRole('button', { name: 'Add part' }));
    await waitFor(() => expect(screen.getByLabelText('Part name')).toHaveValue(''));
  });
});
