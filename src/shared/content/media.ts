import { getSupabaseEnv } from '../env';

/**
 * Public URL for an object in the `public-media` bucket. `storage_path` is the path
 * within the bucket (e.g. "portfolio/harrier-suspension/before.jpg").
 *
 * Pass `width` to use Supabase image transforms for a responsive size (ADR-0009).
 */
export function publicImageUrl(storagePath: string, opts?: { width?: number }): string | null {
  const env = getSupabaseEnv();
  if (!env || !storagePath) return null;
  const base = `${env.url}/storage/v1`;
  if (opts?.width) {
    return `${base}/render/image/public/public-media/${storagePath}?width=${opts.width}&resize=contain&quality=75`;
  }
  return `${base}/object/public/public-media/${storagePath}`;
}
