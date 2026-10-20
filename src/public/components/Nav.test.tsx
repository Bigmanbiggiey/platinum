import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../PublicLayout';

vi.mock('vite-react-ssg', () => ({ Head: () => null }));
vi.mock('./CfAnalytics', () => ({ CfAnalytics: () => null }));

/** Phone width, reduced motion (no GSAP in jsdom): the menu opens and closes instantly. */
function setPhone() {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? true : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as never;
}

function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Go back</button>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={['/', path]}
      initialIndex={1}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/services" element={<p>Services page</p>} />
          <Route path="*" element={<p>Other page</p>} />
        </Route>
      </Routes>
      <BackButton />
    </MemoryRouter>,
  );
}

const menuButton = () => screen.getByRole('button', { name: 'Menu' });
const menu = () => screen.queryByRole('navigation', { name: 'Mobile' });

describe('<Nav /> phone menu', () => {
  beforeEach(setPhone);
  afterEach(() => {
    document.documentElement.style.overflow = '';
  });

  it('has a Menu button wired to the sheet', async () => {
    renderAt('/services');
    expect(menuButton()).toHaveAttribute('aria-controls', 'site-menu');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('site-menu')).toBeInTheDocument();
  });

  it('lists the seven pages, marks the current one, and offers Book a service', async () => {
    renderAt('/services');
    await userEvent.click(menuButton());
    const links = within(menu()!).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Home',
      'Services',
      'Work',
      'Areas',
      'Testimonials',
      'About',
      'Contact',
    ]);
    const current = within(menu()!).getByRole('link', { name: 'Services' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.className).toMatch(/color-confirm/);
    expect(within(menu()!).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    const sheet = document.getElementById('site-menu')!;
    expect(within(sheet).getByRole('link', { name: 'Book a service' })).toHaveAttribute(
      'href',
      '/book',
    );
  });

  it('no longer repeats Call / WhatsApp inside the menu', async () => {
    renderAt('/services');
    await userEvent.click(menuButton());
    const sheet = document.getElementById('site-menu')!;
    expect(within(sheet).queryByText(/whatsapp/i)).not.toBeInTheDocument();
    expect(within(sheet).queryByText(/^call/i)).not.toBeInTheDocument();
  });

  it('focuses the first link, locks the page, and closes on Escape back to the button', async () => {
    renderAt('/services');
    await userEvent.click(menuButton());
    expect(within(menu()!).getByRole('link', { name: 'Home' })).toHaveFocus();
    expect(document.getElementById('main')).toHaveAttribute('inert');
    expect(document.querySelector('footer')).toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(menu()).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
    expect(document.getElementById('main')).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closes when the dimmed page is tapped', async () => {
    renderAt('/services');
    await userEvent.click(menuButton());
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(menu()).not.toBeInTheDocument();
  });

  it('closes after choosing a page and starts focus on the new page', async () => {
    renderAt('/services');
    await userEvent.click(menuButton());
    await userEvent.click(within(menu()!).getByRole('link', { name: 'Work' }));
    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(menu()).not.toBeInTheDocument();
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('closes on Back as well', async () => {
    renderAt('/services');
    await userEvent.click(menuButton());
    // The Back control sits outside the inert regions in this harness.
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(menu()).not.toBeInTheDocument();
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('closes when tapping the page you are already on', async () => {
    renderAt('/services');
    await userEvent.click(menuButton());
    await userEvent.click(within(menu()!).getByRole('link', { name: 'Services' }));
    expect(menu()).not.toBeInTheDocument();
  });
});
