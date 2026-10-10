import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitWithin, prepareImageSet } from './image';

vi.mock('heic2any', () => ({
  default: vi.fn().mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' })),
}));

describe('fitWithin', () => {
  it('scales the long edge down to the limit, keeping aspect ratio', () => {
    expect(fitWithin(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
  });
  it('never upscales', () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
});

describe('prepareImageSet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** jsdom has no canvas/bitmap support — stub the pieces prepareImageSet uses. */
  function stubCanvas(
    blobType: string | ((call: number) => string),
    size = { width: 4000, height: 3000 },
  ) {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never);
    let call = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) =>
      cb(
        new Blob(['re-encoded'], {
          type: typeof blobType === 'string' ? blobType : blobType(call++),
        }),
      ),
    );
    const bitmap = vi.fn().mockResolvedValue({ ...size, close: vi.fn() });
    vi.stubGlobal('createImageBitmap', bitmap);
    return { drawImage, bitmap };
  }

  it('passes SVGs through untouched', async () => {
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    expect(await prepareImageSet(svg)).toEqual({
      file: svg,
      width: null,
      height: null,
      variants: [],
    });
  });

  it('re-encodes a photo to WebP at max 2400px, producing a new file (no EXIF)', async () => {
    const { drawImage } = stubCanvas('image/webp');
    const original = new File(['jpeg-bytes-with-exif-gps'], 'IMG_0042.JPG', { type: 'image/jpeg' });
    const out = await prepareImageSet(original);
    expect(out.file).not.toBe(original);
    expect(out.file.name).toBe('IMG_0042.webp');
    expect(out.file.type).toBe('image/webp');
    expect(out.file.size).toBe('re-encoded'.length); // canvas output, not the original bytes
    expect(out).toMatchObject({ width: 2400, height: 1800 });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2400, 1800);
  });

  it('makes smaller copies for srcset, keeping aspect ratio', async () => {
    const { drawImage } = stubCanvas('image/webp');
    const out = await prepareImageSet(new File(['x'], 'car.png', { type: 'image/png' }));
    expect(out.variants.map((v) => [v.width, v.file.name])).toEqual([
      [480, 'car-w480.webp'],
      [960, 'car-w960.webp'],
      [1600, 'car-w1600.webp'],
    ]);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 480, 360);
  });

  it('makes no copies at or above the photo’s own width', async () => {
    stubCanvas('image/webp', { width: 900, height: 600 });
    const out = await prepareImageSet(new File(['x'], 'small.jpg', { type: 'image/jpeg' }));
    expect(out.variants.map((v) => v.width)).toEqual([480]);
  });

  it('falls back to JPEG when the browser cannot encode WebP', async () => {
    stubCanvas((n) => (n % 2 === 0 ? 'image/png' : 'image/jpeg'));
    const out = await prepareImageSet(new File(['x'], 'photo.jpeg', { type: 'image/jpeg' }));
    expect(out.file.name).toBe('photo.jpg');
    expect(out.file.type).toBe('image/jpeg');
  });

  it('converts iPhone HEIC photos the browser cannot read', async () => {
    const { bitmap } = stubCanvas('image/webp');
    bitmap.mockRejectedValueOnce(new DOMException('unsupported'));
    const out = await prepareImageSet(new File(['heic'], 'IMG_1001.HEIC', { type: '' }));
    expect(out.file.name).toBe('IMG_1001.webp');
    expect(bitmap).toHaveBeenCalledTimes(2);
  });

  it('explains when a file cannot be read at all', async () => {
    const { bitmap } = stubCanvas('image/webp');
    bitmap.mockRejectedValueOnce(new DOMException('unsupported'));
    await expect(
      prepareImageSet(new File(['x'], 'scan.tiff', { type: 'image/tiff' })),
    ).rejects.toThrow(/JPEG or PNG/);
  });
});
