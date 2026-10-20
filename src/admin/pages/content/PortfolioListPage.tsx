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
        <div className="min-w-[12rem] flex-1">
          <Labeled label="New project title">
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
              className="flex items-start gap-3 px-4 py-3 hover:bg-[color:var(--color-ground)]"
            >
              {/* Title first (wraps freely), details on a second line that can wrap too. */}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[color:var(--color-ink)]">{p.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[color:var(--color-muted)]">
                  <span className="break-all">/{p.slug}</span>
                  <span>#{p.display_order}</span>
                  {p.job_id && <Badge tone="neutral">Documented job</Badge>}
                </span>
              </span>
              <Badge tone={p.is_published ? 'pass' : 'muted'}>
                {p.is_published ? 'live' : 'draft'}
              </Badge>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
