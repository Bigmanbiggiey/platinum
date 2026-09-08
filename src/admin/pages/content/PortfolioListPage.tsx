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
import { projects } from '../../lib/resources';
import { ContentBackLink } from './ContentBackLink';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function PortfolioListPage() {
  const list = projects.useList();
  const create = projects.useCreate();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');

  if (list.isLoading) return <Spinner />;

  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Portfolio</PageTitle>
      <Card className="flex flex-wrap items-end gap-2">
        <Labeled label="New project title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Labeled>
        <Button
          variant="accent"
          disabled={!title.trim() || create.isPending}
          onClick={async () => {
            const row = await create.mutateAsync({
              title: title.trim(),
              slug: slugify(title),
              summary: '',
              body_md: '',
              display_order: 100,
              is_published: false,
            });
            navigate(`/admin/content/portfolio/${row.id}`);
          }}
        >
          Create
        </Button>
      </Card>

      {(list.data ?? []).length === 0 ? (
        <EmptyState>No portfolio projects.</EmptyState>
      ) : (
        <Card className="divide-y divide-[color:var(--color-line)] p-0">
          {list.data!.map((p) => (
            <Link
              key={p.id}
              to={`/admin/content/portfolio/${p.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--color-ground)]"
            >
              <Badge tone={p.is_published ? 'pass' : 'muted'}>
                {p.is_published ? 'live' : 'draft'}
              </Badge>
              <span className="font-semibold text-[color:var(--color-ink)]">{p.title}</span>
              <span className="font-mono text-[11px] text-steel">/{p.slug}</span>
              <span className="ml-auto font-mono text-[10px] text-steel">#{p.display_order}</span>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
