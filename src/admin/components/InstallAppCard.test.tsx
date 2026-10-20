import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallAppCard } from './InstallAppCard';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

function setUa(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
}
function setStandalone(on: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: on }) as never;
}
function firePrompt() {
  const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  });
  act(() => void window.dispatchEvent(e));
  return e;
}

describe('InstallAppCard', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(false);
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing when already running as the installed app', () => {
    setUa(IPHONE_UA);
    setStandalone(true);
    const { container } = render(<InstallAppCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing in a browser that cannot install', () => {
    setUa(ANDROID_UA);
    const { container } = render(<InstallAppCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows Share → Add to Home Screen steps on iPhone Safari', () => {
    setUa(IPHONE_UA);
    render(<InstallAppCard />);
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('offers a one-tap install once the browser fires beforeinstallprompt', async () => {
    setUa(ANDROID_UA);
    render(<InstallAppCard />);
    const e = firePrompt();
    expect(e.defaultPrevented).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(e.prompt).toHaveBeenCalled();
  });

  it('"Not now" hides the card and remembers it', async () => {
    setUa(IPHONE_UA);
    const { container, unmount } = render(<InstallAppCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(container).toBeEmptyDOMElement();
    unmount();
    render(<InstallAppCard />);
    expect(screen.queryByText('Install the app')).not.toBeInTheDocument();
  });
});
