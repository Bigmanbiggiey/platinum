import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallPage } from './InstallPage';
import { resetInstallPromptForTests } from '../pwa/useInstallPrompt';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';

function setUa(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
}
function setStandalone(on: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: on }) as never;
}

describe('<InstallPage />', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(false);
    resetInstallPromptForTests();
  });
  afterEach(() => vi.restoreAllMocks());

  it('says so when already running as the installed app', () => {
    setUa(ANDROID_UA);
    setStandalone(true);
    render(<InstallPage />);
    expect(screen.getByText(/installed on this device/)).toBeInTheDocument();
  });

  it('shows the Chrome menu steps when the browser has not offered install', () => {
    setUa(ANDROID_UA);
    render(<InstallPage />);
    expect(screen.getByText('Android (Chrome)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('offers one-tap install once the browser fires beforeinstallprompt', async () => {
    setUa(ANDROID_UA);
    render(<InstallPage />);
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    act(() => void window.dispatchEvent(e));
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(e.prompt).toHaveBeenCalled();
  });

  it('ignores an earlier "Not now" on the Dashboard card', () => {
    localStorage.setItem('pms-install-dismissed', '1');
    setUa(IPHONE_UA);
    render(<InstallPage />);
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
  });

  it('sends iPhone users in another browser to Safari', () => {
    setUa(IPHONE_CHROME_UA);
    render(<InstallPage />);
    expect(screen.getByText(/apps install from/)).toBeInTheDocument();
    expect(screen.queryByText('Add to Home Screen')).not.toBeInTheDocument();
  });
});
