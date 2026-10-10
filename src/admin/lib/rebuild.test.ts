import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('../../shared/env', () => ({
  getSupabaseEnv: () => ({ url: 'https://x.supabase.co', anonKey: 'anon' }),
}));
vi.mock('./db', () => ({
  getDb: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'owner-jwt' } } }) },
  }),
}));

import { rebuildNow, scheduleRebuild, usePublish } from './rebuild';

const fetchMock = vi.fn();
const ok = () =>
  Promise.resolve(new Response(JSON.stringify({ ok: true, configured: true }), { status: 200 }));

describe('rebuild', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset().mockImplementation(ok);
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('Publish/Update rebuilds at once, with the owner’s token', async () => {
    await rebuildNow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://x.supabase.co/functions/v1/rebuild');
    expect(init.headers.Authorization).toBe('Bearer owner-jwt');
  });

  it('debounces a burst of edits into one rebuild', async () => {
    scheduleRebuild();
    scheduleRebuild();
    scheduleRebuild();
    await vi.advanceTimersByTimeAsync(19_000);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a pending rebuild when the tab is closed, instead of dropping it', async () => {
    scheduleRebuild();
    await vi.advanceTimersByTimeAsync(0); // token fetched
    window.dispatchEvent(new Event('pagehide'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(1); // not sent twice
  });

  it('closing the tab with nothing pending sends nothing', () => {
    window.dispatchEvent(new Event('pagehide'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rebuildNow also takes over a pending debounced rebuild', async () => {
    scheduleRebuild();
    await rebuildNow();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tells the owner when the site will be live', async () => {
    const { result } = renderHook(() => usePublish());
    await act(async () => {
      result.current.triggerNow();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.message).toMatch(/live on the website/);
  });

  it('stays quiet for staff (website publishing is owner-only)', async () => {
    fetchMock.mockResolvedValue(new Response('{"ok":false}', { status: 403 }));
    const { result } = renderHook(() => usePublish());
    await act(async () => {
      result.current.triggerNow();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.message).toBe('Saved.');
  });
});
