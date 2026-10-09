import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthState } from '../auth/authContext';
import { TeamPage } from './TeamPage';

const mutateAsync = vi.fn();
vi.mock('../lib/team', () => ({
  useTeam: () => ({ isLoading: false, data: [] }),
  useUpdateMember: () => ({ mutate: vi.fn() }),
  useInviteStaff: () => ({ mutateAsync, isPending: false, isError: false, error: null }),
}));

const owner: AuthState = {
  loading: false,
  session: null,
  profile: {
    user_id: 'u1',
    email: 'owner@example.com',
    display_name: 'Paul',
    role: 'owner',
    is_active: true,
  },
};

describe('<TeamPage /> invite form', () => {
  beforeEach(() => mutateAsync.mockReset());

  it('requires a name and sends email, name and role', async () => {
    mutateAsync.mockResolvedValue({
      inviteUrl: 'https://platinum-point.vercel.app/admin/accept-invite?token_hash=t&type=invite',
      email: 'ann@example.com',
      displayName: 'Ann',
      role: 'owner',
      existed: false,
    });
    const user = userEvent.setup();
    render(
      <AuthContext.Provider value={owner}>
        <TeamPage />
      </AuthContext.Provider>,
    );
    expect(screen.getByLabelText('Name')).toBeRequired();
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Name'), ' Ann ');
    await user.selectOptions(screen.getByLabelText('Role'), 'owner');
    await user.click(screen.getByRole('button', { name: 'Create invite' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      email: 'ann@example.com',
      displayName: 'Ann',
      role: 'owner',
    });
    expect(await screen.findByRole('link', { name: /whatsapp/i })).toBeInTheDocument();
  });

  it('defaults the role to staff', () => {
    render(
      <AuthContext.Provider value={owner}>
        <TeamPage />
      </AuthContext.Provider>,
    );
    expect(screen.getByLabelText('Role')).toHaveValue('staff');
  });
});
