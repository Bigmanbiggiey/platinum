import { Card, Label } from '../../components/ui';
import { PhotoSource } from '../../components/PhotoSource';
import { useObjectUrls } from '../../lib/camera';

/** Check-in photos on the new-job form, held here until the job is created. */
export function PendingPhotos({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const urls = useObjectUrls(files);
  return (
    <Card>
      <Label>Check-in photos (optional)</Label>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        Saved to the job when you check the vehicle in.
      </p>
      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Photos to add">
          {files.map((f, i) => (
            <li key={f.name + i} className="relative">
              <img
                src={urls[i]}
                alt={`Check-in photo ${i + 1}`}
                className="aspect-square w-full rounded object-cover"
              />
              <button
                type="button"
                aria-label={`Remove check-in photo ${i + 1}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <PhotoSource
        className="mt-3"
        label="Add check-in photos"
        onFiles={(added) => onChange([...files, ...added])}
      />
    </Card>
  );
}
