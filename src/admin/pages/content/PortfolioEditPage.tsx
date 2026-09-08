import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Labeled,
  PageTitle,
  Select,
  Spinner,
} from '../../components/ui';
import { MarkdownField } from '../../components/MarkdownField';
import { media, projects } from '../../lib/resources';
import { usePublish } from '../../lib/rebuild';
import { getDb } from '../../lib/db';
import { publicImageUrl } from '../../../shared/content/media';
import type { PortfolioProjectRow } from '../../../shared/supabase/types';

interface GalleryRow {
  media_id: string;
  display_order: number;
  media: { storage_path: string; alt_text: string } | null;
}

function useGallery(projectId: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['portfolio_media', projectId],
    queryFn: async (): Promise<GalleryRow[]> => {
      const { data, error } = await getDb()
        .from('portfolio_media')
        .select('media_id, display_order, media(storage_path, alt_text)')
        .eq('project_id', projectId)
        .order('display_order');
      if (error) throw error;
      return (data ?? []) as unknown as GalleryRow[];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['portfolio_media', projectId] });
  const add = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await getDb()
        .from('portfolio_media')
        .insert({ project_id: projectId, media_id: mediaId, display_order: 100 });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await getDb()
        .from('portfolio_media')
        .delete()
        .eq('project_id', projectId)
        .eq('media_id', mediaId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { list, add, remove };
}

export function PortfolioEditPage() {
  const { id } = useParams();
  const q = projects.useOne(id);
  const update = projects.useUpdate();
  const removeProject = projects.useRemove();
  const allMedia = media.useList();
  const gallery = useGallery(id!);
  const publish = usePublish();
  const navigate = useNavigate();
  const [f, setF] = useState<Partial<PortfolioProjectRow>>({});

  useEffect(() => {
    if (q.data) setF(q.data);
  }, [q.data]);

  if (q.isLoading) return <Spinner />;
  if (!q.data) return <EmptyState>Project not found.</EmptyState>;
  const set = <K extends keyof PortfolioProjectRow>(k: K, v: PortfolioProjectRow[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    await update.mutateAsync({
      id: id!,
      patch: {
        title: f.title,
        slug: f.slug,
        category: f.category || null,
        vehicle_make: f.vehicle_make || null,
        vehicle_model: f.vehicle_model || null,
        vehicle_year: f.vehicle_year ? Number(f.vehicle_year) : null,
        summary: f.summary,
        body_md: f.body_md,
        outcome: f.outcome || null,
        project_date: f.project_date || null,
        cover_media_id: f.cover_media_id || null,
        display_order: Number(f.display_order) || 100,
        is_published: !!f.is_published,
      },
    });
    publish.trigger();
  };

  const galleryIds = new Set((gallery.list.data ?? []).map((g) => g.media_id));

  return (
    <section className="space-y-4">
      <PageTitle
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={!!f.is_published}
                onChange={(e) => set('is_published', e.target.checked)}
              />
              Published
            </label>
            <Button variant="accent" onClick={save} disabled={update.isPending}>
              Save
            </Button>
          </div>
        }
      >
        {f.title || 'Project'}
      </PageTitle>
      {publish.message && <p className="text-sm text-teal">{publish.message}</p>}

      <Card className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Title">
          <Input value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} />
        </Labeled>
        <Labeled label="Slug">
          <Input value={f.slug ?? ''} onChange={(e) => set('slug', e.target.value)} />
        </Labeled>
        <Labeled label="Category">
          <Input value={f.category ?? ''} onChange={(e) => set('category', e.target.value)} />
        </Labeled>
        <Labeled label="Date">
          <Input
            type="date"
            value={f.project_date ?? ''}
            onChange={(e) => set('project_date', e.target.value)}
          />
        </Labeled>
        <Labeled label="Vehicle make">
          <Input
            value={f.vehicle_make ?? ''}
            onChange={(e) => set('vehicle_make', e.target.value)}
          />
        </Labeled>
        <Labeled label="Vehicle model">
          <Input
            value={f.vehicle_model ?? ''}
            onChange={(e) => set('vehicle_model', e.target.value)}
          />
        </Labeled>
        <Labeled label="Vehicle year">
          <Input
            type="number"
            value={String(f.vehicle_year ?? '')}
            onChange={(e) => set('vehicle_year', Number(e.target.value))}
          />
        </Labeled>
        <Labeled label="Display order">
          <Input
            type="number"
            value={String(f.display_order ?? 100)}
            onChange={(e) => set('display_order', Number(e.target.value))}
          />
        </Labeled>
      </Card>

      <Card>
        <Labeled label="Summary">
          <Input value={f.summary ?? ''} onChange={(e) => set('summary', e.target.value)} />
        </Labeled>
      </Card>
      <Card>
        <MarkdownField
          label="Body"
          value={f.body_md ?? ''}
          onChange={(v) => set('body_md', v)}
          rows={8}
        />
      </Card>
      <Card>
        <Labeled label="Outcome (optional)">
          <Input value={f.outcome ?? ''} onChange={(e) => set('outcome', e.target.value)} />
        </Labeled>
      </Card>

      <Card>
        <Labeled label="Cover image">
          <Select
            value={f.cover_media_id ?? ''}
            onChange={(e) => set('cover_media_id', e.target.value || null)}
          >
            <option value="">— none —</option>
            {(allMedia.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.alt_text}
              </option>
            ))}
          </Select>
        </Labeled>
      </Card>

      <Card>
        <Label>Gallery</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(gallery.list.data ?? []).map((g) => (
            <div key={g.media_id} className="relative">
              <img
                src={publicImageUrl(g.media?.storage_path ?? '', { width: 300 }) ?? undefined}
                alt={g.media?.alt_text ?? ''}
                className="aspect-[4/3] w-full rounded object-cover"
              />
              <button
                type="button"
                onClick={() => gallery.remove.mutate(g.media_id)}
                className="absolute right-1 top-1 rounded bg-graphite/80 px-1.5 font-mono text-[10px] text-signal"
              >
                remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-end gap-2">
          <Select id="add-gallery" defaultValue="">
            <option value="">Add from media…</option>
            {(allMedia.data ?? [])
              .filter((m) => !galleryIds.has(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.alt_text}
                </option>
              ))}
          </Select>
          <Button
            onClick={() => {
              const el = document.getElementById('add-gallery') as HTMLSelectElement | null;
              if (el?.value) {
                gallery.add.mutate(el.value);
                el.value = '';
              }
            }}
          >
            Add
          </Button>
        </div>
      </Card>

      <Button
        variant="danger"
        onClick={async () => {
          if (confirm('Delete this project?')) {
            await removeProject.mutateAsync(id!);
            publish.trigger();
            navigate('/admin/content/portfolio');
          }
        }}
      >
        Delete project
      </Button>
    </section>
  );
}
