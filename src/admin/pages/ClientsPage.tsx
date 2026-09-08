import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Labeled,
  PageTitle,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { clients } from '../lib/resources';

const blank = {
  name: '',
  type: 'individual' as 'individual' | 'fleet',
  phone: '',
  whatsapp: '',
  email: '',
  area: '',
  notes: '',
};

export function ClientsPage() {
  const list = clients.useList();
  const create = clients.useCreate();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blank);

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

  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const row = await create.mutateAsync({
      name: form.name.trim(),
      type: form.type,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      area: form.area.trim() || null,
      notes: form.notes.trim() || null,
      source: 'admin',
    });
    setForm(blank);
    setAdding(false);
    navigate(`/admin/clients/${row.id}`);
  };

  if (list.isLoading) return <Spinner />;

  return (
    <section className="space-y-4">
      <PageTitle
        actions={
          <Button variant="accent" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cancel' : 'New client'}
          </Button>
        }
      >
        Clients
      </PageTitle>

      {adding && (
        <Card>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled label="Name">
                <Input value={form.name} onChange={set('name')} autoFocus required />
              </Labeled>
              <Labeled label="Type">
                <Select value={form.type} onChange={set('type')}>
                  <option value="individual">Individual</option>
                  <option value="fleet">Fleet / business</option>
                </Select>
              </Labeled>
              <Labeled label="Phone">
                <Input value={form.phone} onChange={set('phone')} inputMode="tel" />
              </Labeled>
              <Labeled label="WhatsApp">
                <Input value={form.whatsapp} onChange={set('whatsapp')} inputMode="tel" />
              </Labeled>
              <Labeled label="Email">
                <Input value={form.email} onChange={set('email')} type="email" />
              </Labeled>
              <Labeled label="Area">
                <Input value={form.area} onChange={set('area')} />
              </Labeled>
            </div>
            <Labeled label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Labeled>
            {create.isError && (
              <p className="text-sm text-signal">{(create.error as Error).message}</p>
            )}
            <Button variant="accent" type="submit" disabled={!form.name.trim() || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create client'}
            </Button>
          </form>
        </Card>
      )}

      <Input
        placeholder="Search name, phone or area…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState>
          No clients yet — add one above, or convert an enquiry from its request page.
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
