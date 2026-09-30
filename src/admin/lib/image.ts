/**
 * Image prep before upload: downscale + re-encode through a canvas. Re-encoding drops
 * all EXIF metadata — including the GPS location phones embed — so a photo taken at a
 * client's home can never publish where they live. It also shrinks uploads on mobile data.
 */
const PASSTHROUGH = new Set(['image/svg+xml', 'image/gif']);

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File, maxEdge = 2400): Promise<File> {
  if (!file.type.startsWith('image/') || PASSTHROUGH.has(file.type)) return file;

  // `from-image` applies the EXIF orientation before the metadata is discarded.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Older Safari returns PNG when asked for WebP — fall back to JPEG then.
  let blob = await toBlob(canvas, 'image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('Could not process this image.');

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
