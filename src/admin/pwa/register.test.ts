import { registerAdminServiceWorker } from './register';

function fakeNavigator(register = vi.fn().mockResolvedValue({})) {
  return { nav: { serviceWorker: { register } } as unknown as Navigator, register };
}

describe('registerAdminServiceWorker', () => {
  it('does nothing in development', () => {
    const { nav, register } = fakeNavigator();
    registerAdminServiceWorker(false, nav);
    window.dispatchEvent(new Event('load'));
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing where service workers are unsupported', () => {
    expect(() => registerAdminServiceWorker(true, {} as Navigator)).not.toThrow();
  });

  it('registers /admin-sw.js scoped to /admin in production', () => {
    const { nav, register } = fakeNavigator();
    registerAdminServiceWorker(true, nav);
    window.dispatchEvent(new Event('load')); // jsdom may still be "loading"
    expect(register).toHaveBeenCalledWith('/admin-sw.js', { scope: '/admin' });
  });

  it('logs, never throws, when registration fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { nav } = fakeNavigator(vi.fn().mockRejectedValue(new Error('nope')));
    registerAdminServiceWorker(true, nav);
    window.dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});
