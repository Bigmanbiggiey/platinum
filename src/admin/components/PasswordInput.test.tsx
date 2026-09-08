import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './PasswordInput';

describe('<PasswordInput />', () => {
  it('toggles between hidden and visible', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="pw" defaultValue="secret" />);
    const input = screen.getByLabelText('pw') as HTMLInputElement;
    expect(input.type).toBe('password');
    await user.click(screen.getByRole('button', { name: /show/i }));
    expect(input.type).toBe('text');
    await user.click(screen.getByRole('button', { name: /hide/i }));
    expect(input.type).toBe('password');
  });
});
