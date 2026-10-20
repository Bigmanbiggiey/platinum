import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AuthContext, type AuthState } from './auth/authContext';
import { AdminShell } from './AdminShell';

vi.mock('../shared/supabase/auth', () => ({ signOut: vi.fn(async () => {}) }));
vi.mock('./lib/notifications', () => ({ useUnreadCount: () => ({ data: 0 }) }));

/** Emulate a viewport: matchMedia answers (max-width: 767px) and innerWidth agree. */
function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  window.matchMedia = vi.fn((query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    return {
      matches: max ? width <= Number(max[1]) : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  }) as never;
}

function renderShell(role: 'owner' | 'staff', path = '/admin') {
  const state: AuthState = {
    loading: false,
    session: { user: { email: 'paul@example.com' } } as unknown as Session,
    profile: {
      user_id: 'u1',
      email: 'paul@example.com',
      display_name: 'Paul',
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
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<p>Dashboard page</p>} />
            <Route path="*" element={<p>Other page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const drawer = () => document.getElementById('admin-drawer')!;
const menuButton = () => screen.getByRole('button', { name: 'Menu' });

describe('<AdminShell /> on a phone', () => {
  beforeEach(() => {
    localStorage.clear();
    setViewport(360);
  });

  it('has one Menu button wired to the drawer', () => {
    renderShell('owner');
    const btn = menuButton();
    expect(btn).toHaveAttribute('aria-controls', 'admin-drawer');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the header to ☰ + brand: the account controls sit in the drawer', () => {
    renderShell('owner');
    const header = screen.getByRole('banner');
    // The header copies are hidden below 640 px (sm:flex); the drawer has its own.
    const headerCluster = within(header).getByRole('button', { name: 'Sign out' }).parentElement!;
    expect(headerCluster.className).toMatch(/\bhidden\b/);
    expect(headerCluster.className).toMatch(/\bsm:flex\b/);
    const account = within(drawer()).getByRole('region', { name: 'Account' });
    expect(within(account).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(within(account).getByRole('link', { name: 'View site ↗' })).toBeInTheDocument();
    expect(within(account).getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(within(account).getByText('Paul')).toBeInTheDocument();
  });

  it('keeps the closed drawer out of the tab order', () => {
    renderShell('owner');
    expect(drawer()).toHaveAttribute('inert');
  });

  it('opens with focus on the first link, makes the page inert, and closes on Escape', async () => {
    renderShell('owner');
    await userEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(drawer()).not.toHaveAttribute('inert');
    expect(within(drawer()).getByRole('link', { name: 'Dashboard' })).toHaveFocus();
    expect(document.getElementById('admin-main')).toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveFocus();
    expect(document.getElementById('admin-main')).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closes after choosing a page and puts focus on the new page', async () => {
    renderShell('owner');
    await userEvent.click(menuButton());
    await userEvent.click(within(drawer()).getByRole('link', { name: 'Jobs' }));
    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('admin-main')).toHaveFocus();
  });

  it('gives staff Jobs and Schedule plus the account section', async () => {
    renderShell('staff', '/admin/jobs');
    await userEvent.click(menuButton());
    const links = within(within(drawer()).getByRole('navigation', { name: 'Admin' })).getAllByRole(
      'link',
    );
    expect(links.map((l) => l.textContent)).toEqual(['Jobs', 'Schedule']);
    expect(within(drawer()).getByRole('region', { name: 'Account' })).toBeInTheDocument();
  });
});

describe('<AdminShell /> on desktop', () => {
  beforeEach(() => {
    localStorage.clear();
    setViewport(1280);
  });

  it('never locks the page or makes it inert when the rail expands', async () => {
    renderShell('owner');
    expect(drawer()).not.toHaveAttribute('inert');
    await userEvent.click(menuButton()); // starts expanded at desktop width → collapses
    await userEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('admin-main')).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('');
  });
});
