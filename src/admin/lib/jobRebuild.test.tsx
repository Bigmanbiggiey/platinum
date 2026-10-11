import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { rebuildNow, scheduleRebuild, live, update } = vi.hoisted(() => ({
  rebuildNow: vi.fn(),
  scheduleRebuild: vi.fn(),
  live: { current: true },
  update: vi.fn(),
}));

vi.mock('./rebuild', () => ({ rebuildNow, scheduleRebuild }));
vi.mock('./publishJob', () => ({
  isOnWebsite: vi.fn(async () => live.current),
  projectKey: (id: string) => ['portfolio-by-job', id],
}));
vi.mock('./storage', () => ({ uploadMedia: vi.fn() }));
vi.mock('./db', () => {
  const chain = {
    update: (patch: unknown) => {
      update(patch);
      return chain;
    },
    insert: () => chain,
    delete: () => chain,
    eq: async () => ({ error: null }),
  };
  return { getDb: () => ({ from: () => chain }) };
});

import { findings, useUpdateJob } from './jobData';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function save(patch: Record<string, unknown>) {
  const { result } = renderHook(() => useUpdateJob('j1'), { wrapper });
  await act(() => result.current.mutateAsync(patch as never));
}

describe('job edits → website rebuild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    live.current = true;
  });

  it('withdrawing consent on a published job rebuilds at once', async () => {
    await save({ public_consent: false });
    expect(rebuildNow).toHaveBeenCalledTimes(1);
  });

  it('re-opening a published job rebuilds at once', async () => {
    await save({ status: 'in_repair' });
    expect(rebuildNow).toHaveBeenCalledTimes(1);
  });

  it('editing public text schedules a rebuild', async () => {
    await save({ complaint: 'Loses power uphill' });
    expect(scheduleRebuild).toHaveBeenCalledTimes(1);
    expect(rebuildNow).not.toHaveBeenCalled();
  });

  it('private fields never rebuild', async () => {
    await save({ odometer_km: 120000, internal_notes: 'x' });
    expect(scheduleRebuild).not.toHaveBeenCalled();
    expect(rebuildNow).not.toHaveBeenCalled();
  });

  it('jobs not on the website never rebuild', async () => {
    live.current = false;
    await save({ public_consent: false });
    await save({ complaint: 'x' });
    expect(rebuildNow).not.toHaveBeenCalled();
    expect(scheduleRebuild).not.toHaveBeenCalled();
  });

  it('a finding edit on a published job schedules a rebuild', async () => {
    const { result } = renderHook(() => findings.useUpdate('j1'), { wrapper });
    await act(() => result.current.mutateAsync({ id: 'f1', patch: { fix: 'Replaced' } }));
    await waitFor(() => expect(scheduleRebuild).toHaveBeenCalledTimes(1));
  });
});
