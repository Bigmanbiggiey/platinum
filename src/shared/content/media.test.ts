import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../env', () => ({
  getSupabaseEnv: () => ({ url: 'https://x.supabase.co', anonKey: 'k' }),
}));

import { mediaSrcSet, mediaUrl, publicImageUrl, variantPath } from './media';

const BASE = 'https://x.supabase.co/storage/v1/object/public/public-media/';

describe('media URLs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('never uses the image-transform endpoint (not on this Supabase plan)', () => {
    expect(publicImageUrl('uploads/a.webp')).toBe(`${BASE}uploads/a.webp`);
    expect(mediaUrl({ storage_path: 'uploads/a.webp' }, 960)).toBe(`${BASE}uploads/a.webp`);
  });

  it('names copies beside the original', () => {
    expect(variantPath('uploads/a.webp', 480)).toBe('uploads/a-w480.webp');
    expect(variantPath('portfolio/x.y/before', 480)).toBe('portfolio/x.y/before-w480');
  });

  it('picks the smallest copy wide enough, else the original', () => {
    const m = { storage_path: 'uploads/a.webp', width: 2400, variants: [1600, 480, 960] };
    expect(mediaUrl(m, 400)).toBe(`${BASE}uploads/a-w480.webp`);
    expect(mediaUrl(m, 960)).toBe(`${BASE}uploads/a-w960.webp`);
    expect(mediaUrl(m, 2000)).toBe(`${BASE}uploads/a.webp`);
  });

  it('builds srcset from copies plus the original', () => {
    expect(mediaSrcSet({ storage_path: 'uploads/a.webp', width: 1200, variants: [480, 960] })).toBe(
      `${BASE}uploads/a-w480.webp 480w, ${BASE}uploads/a-w960.webp 960w, ${BASE}uploads/a.webp 1200w`,
    );
  });

  it('has no srcset for older uploads without copies', () => {
    expect(
      mediaSrcSet({ storage_path: 'uploads/a.webp', width: null, variants: [] }),
    ).toBeUndefined();
  });
});
