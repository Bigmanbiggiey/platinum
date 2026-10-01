import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AcceptInvitePage } from './AcceptInvitePage';

const verifyInviteToken = vi.fn();
const updatePassword = vi.fn();
vi.mock('../../shared/supabase/auth', () => ({
  verifyInviteToken: (...a: unknown[]) => verifyInviteToken(...a),
  updatePassword: (...a: unknown[]) => updatePassword(...a),
}));

function renderAt(url: string) {
  return render(
    <MemoryRouter
      initialEntries={[url]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/admin/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/admin" element={<p>Admin home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const INVITE = '/admin/accept-invite?token_hash=abc123&type=invite';

describe('<AcceptInvitePage />', () => {
  beforeEach(() => {
    verifyInviteToken.mockReset().mockResolvedValue({ error: null });
    updatePassword.mockReset().mockResolvedValue({ error: null });
  });

  it('shows the invite and consumes nothing on open', () => {
    renderAt(INVITE);
    expect(screen.getByRole('heading', { name: /been invited/i })).toBeInTheDocument();
    expect(verifyInviteToken).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('verifies the token, sets the password, then enters the admin', async () => {
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(verifyInviteToken).toHaveBeenCalledWith('abc123', 'invite');
    expect(updatePassword).toHaveBeenCalledWith('long-enough-pw');
    expect(await screen.findByText('Admin home')).toBeInTheDocument();
  });

  it('rejects a short password without touching the token', async () => {
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'short');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(verifyInviteToken).not.toHaveBeenCalled();
  });

  it('explains an expired or used link', async () => {
    verifyInviteToken.mockResolvedValue({ error: 'Email link is invalid or has expired' });
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText(/ask the owner for a new invite link/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('does not re-verify when only the password step failed', async () => {
    updatePassword
      .mockResolvedValueOnce({ error: 'Password is too weak' })
      .mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText('Password is too weak')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText('Admin home')).toBeInTheDocument();
    expect(verifyInviteToken).toHaveBeenCalledTimes(1);
    expect(updatePassword).toHaveBeenCalledTimes(2);
  });

  it('handles a recovery link for an existing account', () => {
    renderAt('/admin/accept-invite?token_hash=abc123&type=recovery');
    expect(screen.getByRole('heading', { name: 'Set a new password' })).toBeInTheDocument();
  });

  it('says so when the link is incomplete', () => {
    renderAt('/admin/accept-invite?type=invite');
    expect(screen.getByRole('heading', { name: /incomplete/i })).toBeInTheDocument();
    renderAt('/admin/accept-invite?token_hash=abc&type=magiclink');
    expect(screen.getAllByRole('heading', { name: /incomplete/i })).toHaveLength(2);
  });
});
