import { useRef, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMenuDismiss } from './useMenuDismiss';

function Harness({
  lockScroll = true,
  toMain = false,
}: {
  lockScroll?: boolean;
  toMain?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useMenuDismiss({
    open,
    onClose: () => setOpen(false),
    panelRef,
    toggleRef,
    lockScroll,
    inertSelectors: ['#main', 'footer'],
    focusOnClose: toMain ? () => mainRef.current : undefined,
  });
  return (
    <>
      <button ref={toggleRef} onClick={() => setOpen((v) => !v)}>
        Menu
      </button>
      <div ref={panelRef}>
        {open && (
          <>
            <a href="/one">One</a>
            <button onClick={() => setOpen(false)}>Close</button>
          </>
        )}
      </div>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <a href="/page">Page link</a>
      </main>
      <footer>Footer</footer>
    </>
  );
}

describe('useMenuDismiss', () => {
  afterEach(() => {
    document.documentElement.style.overflow = '';
  });

  it('moves focus to the first item when the menu opens', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('link', { name: 'One' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to the toggle', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: 'One' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });

  it('locks page scroll while open and restores the previous value', async () => {
    document.documentElement.style.overflow = 'auto';
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(document.documentElement.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(document.documentElement.style.overflow).toBe('auto');
  });

  it('leaves scroll alone when lockScroll is off', async () => {
    render(<Harness lockScroll={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('makes the page inert while open and lifts it on close', async () => {
    const { container } = render(<Harness />);
    const main = container.querySelector('main')!;
    const footer = container.querySelector('footer')!;
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(main).toHaveAttribute('inert');
    expect(footer).toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(main).not.toHaveAttribute('inert');
    expect(footer).not.toHaveAttribute('inert');
  });

  it('can send focus to the page instead of the toggle (route change)', async () => {
    const { container } = render(<Harness toMain />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.keyboard('{Escape}');
    expect(container.querySelector('main')).toHaveFocus();
  });

  it('cleans up if unmounted while open', async () => {
    const { unmount } = render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    act(() => unmount());
    expect(document.documentElement.style.overflow).toBe('');
    // Escape after unmount must not throw or call a stale handler.
    await userEvent.keyboard('{Escape}');
  });
});
