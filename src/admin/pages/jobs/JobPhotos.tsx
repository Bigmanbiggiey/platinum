import { useRef } from 'react';
import { Badge, Button } from '../../components/ui';
import { publicImageUrl } from '../../../shared/content/media';
import type { JobPhoto } from '../../lib/jobs';

/** Photo grid for one stage/finding with a per-photo website toggle. */
export function JobPhotos({
  photos,
  onUpload,
  onTogglePublic,
  onDelete,
  uploading = false,
  label = 'Add photos',
}: {
  photos: JobPhoto[];
  onUpload: (files: File[]) => void;
  onTogglePublic: (photo: JobPhoto) => void;
  onDelete: (photo: JobPhoto) => void;
  uploading?: boolean;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="relative">
              <img
                src={publicImageUrl(p.media?.storage_path ?? '', { width: 400 }) ?? undefined}
                alt={p.media?.alt_text ?? ''}
                loading="lazy"
                className={`aspect-[4/3] w-full rounded object-cover ${p.is_public ? '' : 'opacity-50'}`}
              />
              {!p.is_public && (
                <span className="absolute left-1 top-1">
                  <Badge tone="muted">Hidden from website</Badge>
                </span>
              )}
              <figcaption className="mt-1 flex gap-2 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => onTogglePublic(p)}
                  className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
                >
                  {p.is_public ? 'Hide from website' : 'Show on website'}
                </button>
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => onDelete(p)}
                  className="ml-auto text-signal"
                >
                  delete
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {/* No `capture` attribute: phones then offer both "Take photo" and the gallery. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        aria-label={label}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onUpload(files);
          e.target.value = '';
        }}
      />
      <Button className="mt-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
        {uploading ? 'Uploading…' : label}
      </Button>
    </div>
  );
}
