import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { prepareImageSet } from './image';
import { variantPath } from '../../shared/content/media';

const BUCKET = 'public-media';

/**
 * Upload an image to public-media and create the `media` row. Returns the media id.
 * Every image is re-encoded first (prepareImageSet) so EXIF/GPS never reaches storage;
 * its smaller copies go up beside it and their widths are recorded in `media.variants`.
 */
export async function uploadMedia(file: File, alt: string): Promise<string> {
  const db = getDb();
  const prepared = await prepareImageSet(file);
  const ext = prepared.file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const put = (p: string, f: File) =>
    db.storage.from(BUCKET).upload(p, f, { contentType: f.type || 'image/jpeg', upsert: false });

  const up = await put(path, prepared.file);
  if (up.error) throw up.error;

  // A copy that fails to upload is simply left out — the site falls back to the original.
  const results = await Promise.all(
    prepared.variants.map(async (v) => ({
      width: v.width,
      ok: !(await put(variantPath(path, v.width), v.file)).error,
    })),
  );
  const variants = results.filter((r) => r.ok).map((r) => r.width);

  const { data, error } = await db
    .from('media')
    .insert({
      storage_path: path,
      alt_text: alt,
      width: prepared.width,
      height: prepared.height,
      variants,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, alt }: { file: File; alt: string }) => uploadMedia(file, alt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media', 'list'] }),
  });
}
