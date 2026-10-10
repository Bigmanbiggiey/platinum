import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AuthContext, type AuthState } from './auth/authContext';
import { RequireOwner, RoleHome } from './RequireOwner';

vi.mock('../shared/supabase/auth', () => ({ signOut: vi.fn(async () => {}) }));

function renderAt(path: string, role: 'owner' | 'staff') {
  const state: AuthState = {
    loading: false,
    session: { user: { email: 'kevin@example.com' } } as unknown as Session,
    profile: {
      user_id: 'u1',
      email: 'kevin@example.com',
      display_name: 'Kevin',
      role,
      is_active: true,
    },
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/admin" element={<RoleHome owner={<p>Dashboard</p>} />} />
          <Route path="/admin/jobs" element={<p>Jobs list</p>} />
          <Route element={<RequireOwner />}>
            <Route path="/admin/clients" element={<p>Clients list</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<RequireOwner />', () => {
  it('lets the owner through', () => {
    renderAt('/admin/clients', 'owner');
    expect(screen.getByText('Clients list')).toBeInTheDocument();
  });

  it('shows staff the no-access screen with sign-out and a way back to Jobs', () => {
    renderAt('/admin/clients', 'staff');
    expect(screen.queryByText('Clients list')).not.toBeInTheDocument();
    expect(screen.getByText(/for the owner/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Jobs' })).toHaveAttribute('href', '/admin/jobs');
  });
});

describe('<RoleHome />', () => {
  it('shows the owner the dashboard', () => {
    renderAt('/admin', 'owner');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('sends staff to Jobs', () => {
    renderAt('/admin', 'staff');
    expect(screen.getByText('Jobs list')).toBeInTheDocument();
  });
});
