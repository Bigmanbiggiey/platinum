import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Labeled,
  PageTitle,
  Spinner,
} from '../../components/ui';
import { services } from '../../lib/resources';
import { ContentBackLink } from './ContentBackLink';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function ServicesListPage() {
  const list = services.useList();
  const create = services.useCreate();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');

  if (list.isLoading) return <Spinner />;

  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Services</PageTitle>

      <Card className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Labeled label="New service title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Labeled>
        </div>
        <Button
          variant="accent"
          disabled={!title.trim() || create.isPending}
          onClick={async () => {
            const row = await create.mutateAsync({
              title: title.trim(),
              slug: slugify(title),
              summary: '',
              description_md: '',
              display_order: 100,
              is_published: false,
            });
            navigate(`/admin/content/services/${row.id}`);
          }}
        >
          Create
        </Button>
      </Card>

      {(list.data ?? []).length === 0 ? (
        <EmptyState>No services.</EmptyState>
      ) : (
        <Card className="divide-y divide-[color:var(--color-line)] p-0">
          {list.data!.map((s) => (
            <Link
              key={s.id}
              to={`/admin/content/services/${s.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[color:var(--color-ground)]"
            >
              {/* Title first (wraps freely), details on a second line that can wrap too. */}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[color:var(--color-ink)]">{s.title}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-[color:var(--color-muted)]">
                  <span className="break-all">/{s.slug}</span>
                  {s.category && <span>{s.category}</span>}
                  <span>#{s.display_order}</span>
                </span>
              </span>
              <Badge tone={s.is_published ? 'pass' : 'muted'}>
                {s.is_published ? 'live' : 'draft'}
              </Badge>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
