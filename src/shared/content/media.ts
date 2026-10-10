import { getSupabaseEnv } from '../env';

/**
 * Public URL for an object in the `public-media` bucket. `storage_path` is the path
 * within the bucket (e.g. "portfolio/harrier-suspension/before.jpg").
 *
 * Always the stored file: the Supabase plan has no image transforms (`render/image`
 * answers 403 FeatureNotEnabled), so responsive sizes are copies made at upload —
 * see `mediaUrl` / `mediaSrcSet`.
 */
export function publicImageUrl(storagePath: string): string | null {
  const env = getSupabaseEnv();
  if (!env || !storagePath) return null;
  return `${env.url}/storage/v1/object/public/public-media/${storagePath}`;
}

/** `uploads/abc.webp` → `uploads/abc-w480.webp`: where a smaller copy lives. */
export function variantPath(storagePath: string, width: number): string {
  const dot = storagePath.lastIndexOf('.');
  return dot > storagePath.lastIndexOf('/')
    ? `${storagePath.slice(0, dot)}-w${width}${storagePath.slice(dot)}`
    : `${storagePath}-w${width}`;
}

/** The bits of a `media` row needed to pick a size. */
export interface SizedMedia {
  storage_path: string;
  width?: number | null;
  variants?: number[] | null;
}

/** The smallest stored copy at least `width` wide — or the original. */
export function mediaUrl(media: SizedMedia, width?: number): string | null {
  const fit = width
    ? [...(media.variants ?? [])].sort((a, b) => a - b).find((w) => w >= width)
    : undefined;
  return publicImageUrl(fit ? variantPath(media.storage_path, fit) : media.storage_path);
}

/** `srcset` across the stored copies and the original; undefined when there's no choice. */
export function mediaSrcSet(media: SizedMedia): string | undefined {
  const variants = media.variants ?? [];
  if (variants.length === 0 || !media.width) return undefined;
  const entries = [...variants]
    .filter((w) => w < media.width!)
    .sort((a, b) => a - b)
    .map((w) => `${publicImageUrl(variantPath(media.storage_path, w))} ${w}w`);
  entries.push(`${publicImageUrl(media.storage_path)} ${media.width}w`);
  return entries.join(', ');
}
