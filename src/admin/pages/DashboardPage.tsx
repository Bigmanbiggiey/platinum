import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, Label, PageTitle, Spinner } from '../components/ui';
import { getDb, prettyType, statusTone } from '../lib/db';
import { useUnreadCount } from '../lib/notifications';
import { useRequests } from '../lib/requests';

type CountFilter = [column: string, op: 'eq' | 'is', value: unknown];
function useCount(key: string, table: string, filter?: CountFilter) {
  return useQuery({
    queryKey: ['count', table, key],
    queryFn: async () => {
      let q = getDb().from(table).select('id', { count: 'exact', head: true });
      if (filter) {
        const [col, op, val] = filter;
        q = op === 'is' ? q.is(col, val as never) : q.eq(col, val as never);
      }
      const { count } = await q;
      return count ?? 0;
    },
  });
}

function Stat({ label, value, to }: { label: string; value: number | undefined; to?: string }) {
  const body = (
    <div className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <Label>{label}</Label>
      <p className="mt-1 text-2xl font-bold text-[color:var(--color-ink)]">{value ?? '—'}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function DashboardPage() {
  const unread = useUnreadCount();
  const newReqs = useCount('new', 'service_request', ['status', 'eq', 'new']);
  const pendingT = useCount('pending', 'testimonial', ['status', 'eq', 'pending']);
  const clients = useCount('all', 'client');
  const vehicles = useCount('all', 'vehicle');
  const recent = useRequests({ status: 'all', type: 'all', search: '' });

  return (
    <section className="space-y-8">
      <PageTitle>Dashboard</PageTitle>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Unread" value={unread.data} to="/admin/notifications" />
        <Stat label="New requests" value={newReqs.data} to="/admin/requests" />
        <Stat label="Pending testimonials" value={pendingT.data} to="/admin/content" />
        <Stat label="Clients" value={clients.data} to="/admin/clients" />
        <Stat label="Vehicles" value={vehicles.data} />
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-[color:var(--color-ink)]">Recent requests</h2>
        {recent.isLoading ? (
          <Spinner />
        ) : (recent.data ?? []).length === 0 ? (
          <EmptyState>No requests yet.</EmptyState>
        ) : (
          <Card className="divide-y divide-[color:var(--color-line)] p-0">
            {recent.data!.slice(0, 8).map((r) => (
              <Link
                key={r.id}
                to={`/admin/requests/${r.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--color-ground)]"
              >
                <span className="font-mono text-[10px] text-steel">
                  {new Date(r.created_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                </span>
                <span className="font-semibold text-[color:var(--color-ink)]">
                  {r.contact_name}
                </span>
                <span className="text-sm text-[color:var(--color-muted)]">
                  {prettyType(r.request_type)}
                </span>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </section>
  );
}
