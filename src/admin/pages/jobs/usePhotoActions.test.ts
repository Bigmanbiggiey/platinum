import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const trigger = vi.fn();
const triggerNow = vi.fn();
const published = { current: true };
const addPhoto = vi.fn().mockResolvedValue(undefined);
const updatePhoto = vi.fn((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());

vi.mock('../../lib/rebuild', () => ({
  usePublish: () => ({ trigger, triggerNow, message: 'Your changes will be live soon.' }),
}));
vi.mock('../../lib/publishJob', () => ({
  usePublishedProject: () => ({ data: { is_published: published.current } }),
}));
vi.mock('../../lib/jobData', () => ({
  useAddPhoto: () => ({ mutateAsync: addPhoto }),
  photos: {
    useUpdate: () => ({ mutate: updatePhoto }),
    useRemove: () => ({ mutate: vi.fn() }),
  },
}));

import { usePhotoActions } from './usePhotoActions';

const job = { id: 'j1', vehicle_label: '2021 Toyota Fielder' };
const file = () => new File(['x'], 'a.jpg', { type: 'image/jpeg' });
const photo = { id: 'p1', is_public: true } as never;

describe('usePhotoActions → website', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    published.current = true;
  });

  it('rebuilds once, at once, after uploading to a published job', async () => {
    const { result } = renderHook(() => usePhotoActions(job));
    await act(() => result.current.upload([file(), file()], 'repair', null));
    expect(addPhoto).toHaveBeenCalledTimes(2);
    expect(triggerNow).toHaveBeenCalledTimes(1);
    expect(result.current.notice).toMatch(/live/);
  });

  it('show/hide on a published job schedules a rebuild', () => {
    const { result } = renderHook(() => usePhotoActions(job));
    act(() => result.current.togglePublic(photo));
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('leaves the site alone for a job that isn’t on the website', async () => {
    published.current = false;
    const { result } = renderHook(() => usePhotoActions(job));
    await act(() => result.current.upload([file()], 'check_in', null));
    act(() => result.current.togglePublic(photo));
    expect(triggerNow).not.toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();
    expect(result.current.notice).toBe('');
  });
});
