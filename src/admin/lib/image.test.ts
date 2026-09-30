import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitWithin, prepareImage } from './image';

describe('fitWithin', () => {
  it('scales the long edge down to the limit, keeping aspect ratio', () => {
    expect(fitWithin(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
  });
  it('never upscales', () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
});

describe('prepareImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** jsdom has no canvas/bitmap support — stub the pieces prepareImage uses. */
  function stubCanvas(blobTypes: string[]) {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never);
    const queue = [...blobTypes];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) =>
      cb(new Blob(['re-encoded'], { type: queue.shift() })),
    );
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }),
    );
    return { drawImage };
  }

  it('passes SVGs through untouched', async () => {
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    expect(await prepareImage(svg)).toBe(svg);
  });

  it('re-encodes a photo to WebP at max 2400px, producing a new file (no EXIF)', async () => {
    const { drawImage } = stubCanvas(['image/webp']);
    const original = new File(['jpeg-bytes-with-exif-gps'], 'IMG_0042.JPG', { type: 'image/jpeg' });
    const out = await prepareImage(original);
    expect(out).not.toBe(original);
    expect(out.name).toBe('IMG_0042.webp');
    expect(out.type).toBe('image/webp');
    expect(out.size).toBe('re-encoded'.length); // canvas output, not the original bytes
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2400, 1800);
  });

  it('falls back to JPEG when the browser cannot encode WebP', async () => {
    stubCanvas(['image/png', 'image/jpeg']);
    const out = await prepareImage(new File(['x'], 'photo.jpeg', { type: 'image/jpeg' }));
    expect(out.name).toBe('photo.jpg');
    expect(out.type).toBe('image/jpeg');
  });
});
