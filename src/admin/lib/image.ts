/**
 * Image prep before upload: downscale + re-encode through a canvas. Re-encoding drops
 * all EXIF metadata — including the GPS location phones embed — so a photo taken at a
 * client's home can never publish where they live. It also shrinks uploads on mobile data.
 *
 * Whatever comes in (JPEG, PNG, WebP, AVIF, GIF, BMP, iPhone HEIC…) goes out as WebP —
 * or JPEG on browsers that can't encode WebP — so every photo renders on every device.
 * Smaller copies are made here too: the Supabase plan has no image transforms, so the
 * site serves these stored sizes instead (see `shared/content/media.ts`).
 */
const PASSTHROUGH = new Set(['image/svg+xml']);

/** Widths of the smaller copies kept beside each photo, for `srcset`. */
export const VARIANT_WIDTHS = [480, 960, 1600] as const;

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

const isHeic = (file: File) => /^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);

/** Decode to a bitmap, converting HEIC first where the browser can't read it (all but Safari). */
async function decode(file: File): Promise<ImageBitmap> {
  // `from-image` applies the EXIF orientation before the metadata is discarded.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (err) {
    if (!isHeic(file)) {
      throw new Error(`Could not read “${file.name}”. Please use a JPEG or PNG photo.`, {
        cause: err,
      });
    }
  }
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  const jpeg = Array.isArray(converted) ? converted[0] : converted;
  return createImageBitmap(jpeg, { imageOrientation: 'from-image' });
}

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Older Safari returns PNG when asked for WebP — fall back to JPEG then.
  let blob = await toBlob(canvas, 'image/webp', quality);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
  if (!blob) throw new Error('Could not process this image.');
  return blob;
}

const extOf = (blob: Blob) => (blob.type === 'image/webp' ? 'webp' : 'jpg');

export interface PreparedImage {
  file: File;
  width: number | null;
  height: number | null;
  /** Smaller copies, narrowest first; empty for SVGs and small photos. */
  variants: { width: number; file: File }[];
}

/** The upload-ready photo plus its smaller copies. */
export async function prepareImageSet(file: File, maxEdge = 2400): Promise<PreparedImage> {
  if (PASSTHROUGH.has(file.type)) return { file, width: null, height: null, variants: [] };

  const bitmap = await decode(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const main = await encode(bitmap, width, height, 0.85);
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';

    const variants: PreparedImage['variants'] = [];
    for (const w of VARIANT_WIDTHS) {
      if (w >= width) break;
      const blob = await encode(bitmap, w, Math.round((height * w) / width), 0.8);
      variants.push({
        width: w,
        file: new File([blob], `${base}-w${w}.${extOf(blob)}`, { type: blob.type }),
      });
    }
    return {
      file: new File([main], `${base}.${extOf(main)}`, { type: main.type }),
      width,
      height,
      variants,
    };
  } finally {
    bitmap.close();
  }
}
