import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AuthContext, type AuthState } from './auth/authContext';
import { RequireAuth } from './RequireAuth';

const signOut = vi.fn(async () => {});
vi.mock('../shared/supabase/auth', () => ({ signOut: () => signOut() }));

const session = { user: { email: 'mechanic@example.com' } } as unknown as Session;

function renderGuard(state: AuthState) {
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter
        initialEntries={['/admin']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/admin/login" element={<p>Login page</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/admin" element={<p>Dashboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<RequireAuth /> — signed in without admin access', () => {
  beforeEach(() => signOut.mockClear());

  it('says which account is signed in and lets the person sign out', async () => {
    const user = userEvent.setup();
    renderGuard({ loading: false, session, profile: null });

    expect(screen.getByText(/doesn.t have admin access/i)).toBeInTheDocument();
    expect(screen.getByText('mechanic@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('treats an inactive profile the same way', () => {
    renderGuard({
      loading: false,
      session,
      profile: { is_active: false } as AuthState['profile'],
    });
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('lets an active admin through', () => {
    renderGuard({ loading: false, session, profile: { is_active: true } as AuthState['profile'] });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
