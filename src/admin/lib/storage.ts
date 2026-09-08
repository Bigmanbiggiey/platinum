import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';

const BUCKET = 'public-media';

/** Upload an image to public-media and create the `media` row. Returns the media id. */
export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, alt }: { file: File; alt: string }) => {
      const db = getDb();
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `uploads/${crypto.randomUUID()}.${ext}`;
      const up = await db.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      if (up.error) throw up.error;

      // Read natural size for responsive rendering.
      const dims = await imageSize(file).catch(() => ({ width: null, height: null }));

      const { data, error } = await db
        .from('media')
        .insert({ storage_path: path, alt_text: alt, width: dims.width, height: dims.height })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media', 'list'] }),
  });
}

function imageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}
