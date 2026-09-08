import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, Input, PageTitle, Spinner } from '../components/ui';
import { clients } from '../lib/resources';

export function ClientsPage() {
  const list = clients.useList();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return list.data ?? [];
    return (list.data ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.phone ?? '').includes(s) ||
        (c.area ?? '').toLowerCase().includes(s),
    );
  }, [list.data, search]);

  if (list.isLoading) return <Spinner />;

  return (
    <section className="space-y-4">
      <PageTitle>Clients</PageTitle>
      <Input
        placeholder="Search name, phone or area…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {filtered.length === 0 ? (
        <EmptyState>
          No clients yet — convert an enquiry from its request page to add one.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-[color:var(--color-line)] p-0">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/admin/clients/${c.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--color-ground)]"
            >
              <span className="font-semibold text-[color:var(--color-ink)]">{c.name}</span>
              <Badge tone="neutral">{c.type}</Badge>
              <span className="font-mono text-[11px] text-steel">{c.phone ?? '—'}</span>
              {c.area && <span className="text-sm text-[color:var(--color-muted)]">{c.area}</span>}
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
