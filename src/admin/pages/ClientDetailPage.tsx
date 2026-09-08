import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { clients, vehicles, type AdminClient } from '../lib/resources';
import { getDb, statusTone } from '../lib/db';
import { InlineCrud, type FieldDef } from '../components/InlineCrud';

const vehicleFields: FieldDef[] = [
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'registration', label: 'Reg' },
  { key: 'mileage', label: 'Mileage', type: 'number' },
  { key: 'notes', label: 'Notes' },
];

export function ClientDetailPage() {
  const { id } = useParams();
  const q = clients.useOne(id);
  const update = clients.useUpdate();
  const remove = clients.useRemove();
  const navigate = useNavigate();
  const [f, setF] = useState<Partial<AdminClient>>({});

  useEffect(() => {
    if (q.data) setF(q.data);
  }, [q.data]);

  const requests = useQuery({
    queryKey: ['client-requests', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await getDb()
        .from('service_request')
        .select('id, contact_name, request_type, status, created_at')
        .eq('client_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Scope the vehicles resource list to this client.
  const clientVehicles = vehicles.useList((rows) => rows.filter((v) => v.client_id === id));

  if (q.isLoading) return <Spinner />;
  if (!q.data) return <EmptyState>Client not found.</EmptyState>;
  const set = (k: keyof AdminClient) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <section className="space-y-6">
      <PageTitle
        actions={
          <div className="flex gap-2">
            <Link
              to="/admin/clients"
              className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              ← Clients
            </Link>
            <Button
              variant="accent"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  id: id!,
                  patch: {
                    name: f.name,
                    type: f.type,
                    phone: f.phone || null,
                    whatsapp: f.whatsapp || null,
                    email: f.email || null,
                    area: f.area || null,
                    notes: f.notes || null,
                  },
                })
              }
            >
              Save
            </Button>
          </div>
        }
      >
        {f.name || 'Client'}
      </PageTitle>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Name">
          <Input value={f.name ?? ''} onChange={set('name')} />
        </Labeled>
        <Labeled label="Type">
          <Select value={f.type ?? 'individual'} onChange={set('type')}>
            <option value="individual">Individual</option>
            <option value="fleet">Fleet / business</option>
          </Select>
        </Labeled>
        <Labeled label="Phone">
          <Input value={f.phone ?? ''} onChange={set('phone')} />
        </Labeled>
        <Labeled label="WhatsApp">
          <Input value={f.whatsapp ?? ''} onChange={set('whatsapp')} />
        </Labeled>
        <Labeled label="Email">
          <Input value={f.email ?? ''} onChange={set('email')} />
        </Labeled>
        <Labeled label="Area">
          <Input value={f.area ?? ''} onChange={set('area')} />
        </Labeled>
      </Card>
      <Card>
        <Labeled label="Notes">
          <Textarea
            value={f.notes ?? ''}
            onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))}
          />
        </Labeled>
      </Card>

      <div>
        <h2 className="mb-2 font-semibold text-[color:var(--color-ink)]">Vehicles</h2>
        <InlineCrud
          resource={{
            useList: () => clientVehicles,
            useCreate: vehicles.useCreate,
            useUpdate: vehicles.useUpdate,
            useRemove: vehicles.useRemove,
          }}
          fields={vehicleFields}
          blank={{ client_id: id, make: '' }}
          publishOnChange={false}
        />
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-[color:var(--color-ink)]">Requests</h2>
        {requests.isLoading ? (
          <Spinner />
        ) : (requests.data ?? []).length === 0 ? (
          <EmptyState>No requests linked to this client.</EmptyState>
        ) : (
          <Card className="divide-y divide-[color:var(--color-line)] p-0">
            {requests.data!.map((r) => (
              <Link
                key={r.id}
                to={`/admin/requests/${r.id}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-[color:var(--color-ground)]"
              >
                <span className="font-mono text-[10px] text-steel">
                  {new Date(r.created_at).toLocaleDateString('en-KE')}
                </span>
                <span className="text-sm">{r.request_type.replace(/_/g, ' ')}</span>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </div>

      <Button
        variant="danger"
        onClick={async () => {
          if (confirm('Delete this client? Vehicles are removed too; requests are unlinked.')) {
            await remove.mutateAsync(id!);
            navigate('/admin/clients');
          }
        }}
      >
        Delete client
      </Button>
    </section>
  );
}
