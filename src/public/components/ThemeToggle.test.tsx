import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { STORAGE_KEY } from '../../shared/theme';

const html = document.documentElement;

/** Emulate the phone's own setting. */
function setSystem(scheme: 'light' | 'dark') {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') ? scheme === 'dark' : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as never;
}

const button = () => screen.getByRole('button', { name: 'Dark theme' });

describe('<ThemeToggle />', () => {
  beforeEach(() => {
    localStorage.clear();
    delete html.dataset.theme;
  });

  it('is one "Dark theme" button whose state is aria-pressed', () => {
    setSystem('light');
    render(<ThemeToggle />);
    expect(button()).toHaveAttribute('aria-pressed', 'false');
    expect(button()).toHaveAttribute('title', 'Switch to dark theme');
  });

  it('draws both icons and lets CSS pick one (right before hydration)', () => {
    setSystem('light');
    const { container } = render(<ThemeToggle />);
    expect(container.querySelector('svg.when-light')).toBeInTheDocument();
    expect(container.querySelector('svg.when-dark')).toBeInTheDocument();
  });

  it('switches a light phone to dark, then back to following the phone', async () => {
    setSystem('light');
    render(<ThemeToggle />);
    await userEvent.click(button());
    expect(html.dataset.theme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(button()).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button());
    expect(html.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(button()).toHaveAttribute('aria-pressed', 'false');
  });

  it('starts pressed on a dark phone and pins light when tapped', async () => {
    setSystem('dark');
    render(<ThemeToggle />);
    expect(button()).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button());
    expect(html.dataset.theme).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(button()).toHaveAttribute('aria-pressed', 'false');
  });
});
