import { useRef, useState } from 'react';
import { Button, Card, EmptyState, Input, Label, PageTitle, Spinner } from '../../components/ui';
import { media } from '../../lib/resources';
import { useUploadMedia } from '../../lib/storage';
import { publicImageUrl } from '../../../shared/content/media';
import { ContentBackLink } from './ContentBackLink';

export function MediaPage() {
  const list = media.useList();
  const update = media.useUpdate();
  const remove = media.useRemove();
  const upload = useUploadMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');

  if (list.isLoading) return <Spinner />;

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!alt.trim()) {
      alert('Please add alt text describing the image.');
      return;
    }
    await upload.mutateAsync({ file, alt: alt.trim() });
    setAlt('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Media library</PageTitle>

      <Card className="space-y-3">
        <label className="block">
          <Label>Image file (jpg / png / webp)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="mt-1 block w-full text-sm text-[color:var(--color-muted)]"
          />
        </label>
        <label className="block">
          <Label>Alt text (required — describe the image)</Label>
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
        </label>
        <Button variant="accent" onClick={onUpload} disabled={upload.isPending}>
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </Button>
        {upload.isError && <p className="text-sm text-signal">{(upload.error as Error).message}</p>}
      </Card>

      {(list.data ?? []).length === 0 ? (
        <EmptyState>No images yet.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.data!.map((m) => (
            <Card key={m.id} className="space-y-2">
              <img
                src={publicImageUrl(m.storage_path, { width: 400 }) ?? undefined}
                alt={m.alt_text}
                className="aspect-[4/3] w-full rounded object-cover"
              />
              <Input
                defaultValue={m.alt_text}
                onBlur={(e) =>
                  e.target.value !== m.alt_text &&
                  update.mutate({ id: m.id, patch: { alt_text: e.target.value } })
                }
              />
              <div className="flex items-center justify-between">
                <code className="truncate font-mono text-[10px] text-steel">{m.storage_path}</code>
                <button
                  type="button"
                  className="font-mono text-[10px] uppercase tracking-widest text-signal"
                  onClick={() => confirm('Delete this image?') && remove.mutate(m.id)}
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
