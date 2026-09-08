import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, Input, Labeled, PageTitle, Spinner } from '../../components/ui';
import { MarkdownField } from '../../components/MarkdownField';
import { services } from '../../lib/resources';
import { usePublish } from '../../lib/rebuild';
import type { ServiceRow } from '../../../shared/supabase/types';

export function ServiceEditPage() {
  const { id } = useParams();
  const q = services.useOne(id);
  const update = services.useUpdate();
  const remove = services.useRemove();
  const publish = usePublish();
  const navigate = useNavigate();
  const [f, setF] = useState<Partial<ServiceRow>>({});

  useEffect(() => {
    if (q.data) setF(q.data);
  }, [q.data]);

  if (q.isLoading) return <Spinner />;
  if (!q.data) return <EmptyState>Service not found.</EmptyState>;

  const set = <K extends keyof ServiceRow>(k: K, v: ServiceRow[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    await update.mutateAsync({
      id: id!,
      patch: {
        title: f.title,
        slug: f.slug,
        category: f.category || null,
        summary: f.summary,
        description_md: f.description_md,
        whats_included_md: f.whats_included_md || null,
        icon: f.icon || null,
        display_order: Number(f.display_order) || 100,
        is_published: !!f.is_published,
        seo_title: f.seo_title || null,
        seo_description: f.seo_description || null,
      },
    });
    publish.trigger();
  };

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
        {f.title || 'Service'}
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
        <Labeled label="Display order">
          <Input
            type="number"
            value={String(f.display_order ?? 100)}
            onChange={(e) => set('display_order', Number(e.target.value))}
          />
        </Labeled>
      </Card>

      <Card>
        <Labeled label="Summary (one or two lines)">
          <Input value={f.summary ?? ''} onChange={(e) => set('summary', e.target.value)} />
        </Labeled>
      </Card>

      <Card>
        <MarkdownField
          label="Description"
          value={f.description_md ?? ''}
          onChange={(v) => set('description_md', v)}
          rows={8}
        />
      </Card>
      <Card>
        <MarkdownField
          label="What's included (optional)"
          value={f.whats_included_md ?? ''}
          onChange={(v) => set('whats_included_md', v)}
        />
      </Card>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Labeled label="SEO title (optional)">
          <Input value={f.seo_title ?? ''} onChange={(e) => set('seo_title', e.target.value)} />
        </Labeled>
        <Labeled label="SEO description (optional)">
          <Input
            value={f.seo_description ?? ''}
            onChange={(e) => set('seo_description', e.target.value)}
          />
        </Labeled>
      </Card>

      <Button
        variant="danger"
        onClick={async () => {
          if (confirm('Delete this service?')) {
            await remove.mutateAsync(id!);
            publish.trigger();
            navigate('/admin/content/services');
          }
        }}
      >
        Delete service
      </Button>
    </section>
  );
}
