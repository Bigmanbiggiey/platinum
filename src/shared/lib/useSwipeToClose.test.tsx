import { useRef } from 'react';
import { render } from '@testing-library/react';
import { useSwipeToClose } from './useSwipeToClose';

function Drawer({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useSwipeToClose(ref, true, onClose);
  return <div ref={ref} data-testid="drawer" />;
}

/** jsdom has no TouchEvent constructor with touches; build one by hand. */
function touch(el: Element, type: string, x: number, y: number) {
  const e = new Event(type, { bubbles: true });
  Object.defineProperty(e, 'touches', {
    value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }],
  });
  el.dispatchEvent(e);
}

describe('useSwipeToClose', () => {
  it('closes after a leftward swipe and leaves no inline transform behind', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Drawer onClose={onClose} />);
    const el = getByTestId('drawer');
    touch(el, 'touchstart', 200, 300);
    touch(el, 'touchmove', 150, 302);
    expect(el.style.transform).toBe('translateX(-50px)');
    touch(el, 'touchmove', 40, 304);
    touch(el, 'touchend', 0, 0);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(el.style.transform).toBe('');
  });

  it('ignores a vertical drag (the drawer scrolls instead)', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Drawer onClose={onClose} />);
    const el = getByTestId('drawer');
    touch(el, 'touchstart', 200, 300);
    touch(el, 'touchmove', 190, 200);
    touch(el, 'touchmove', 100, 100);
    touch(el, 'touchend', 0, 0);
    expect(onClose).not.toHaveBeenCalled();
    expect(el.style.transform).toBe('');
  });

  it('ignores a rightward drag', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Drawer onClose={onClose} />);
    const el = getByTestId('drawer');
    touch(el, 'touchstart', 100, 300);
    touch(el, 'touchmove', 200, 300);
    touch(el, 'touchend', 0, 0);
    expect(onClose).not.toHaveBeenCalled();
  });
});
