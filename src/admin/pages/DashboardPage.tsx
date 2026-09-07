import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../../shared/supabase/client';

type Filter = [column: string, op: 'eq' | 'is', value: unknown];

function useCount(key: string, table: string, filter?: Filter) {
  return useQuery({
    queryKey: ['count', table, key],
    queryFn: async () => {
      const db = getSupabaseClient();
      if (!db) return 0;
      let q = db.from(table).select('id', { count: 'exact', head: true });
      if (filter) {
        const [col, op, val] = filter;
        q = op === 'is' ? q.is(col, val as never) : q.eq(col, val as never);
      }
      const { count } = await q;
      return count ?? 0;
    },
  });
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-slate/70 bg-slate/30 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value ?? '—'}</p>
    </div>
  );
}

export function DashboardPage() {
  const unread = useCount('unread', 'notification', ['read_at', 'is', null]);
  const newReqs = useCount('new', 'service_request', ['status', 'eq', 'new']);
  const pendingT = useCount('pending', 'testimonial', ['status', 'eq', 'pending']);
  const clients = useCount('all', 'client');
  const vehicles = useCount('all', 'vehicle');

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Unread" value={unread.data} />
        <Stat label="New requests" value={newReqs.data} />
        <Stat label="Pending testimonials" value={pendingT.data} />
        <Stat label="Clients" value={clients.data} />
        <Stat label="Vehicles" value={vehicles.data} />
      </div>
      <p className="mt-8 text-sm text-platinum">
        Notifications, the request pipeline, clients &amp; vehicles, the CMS and settings are being
        built in Phase 3 (see <code>docs/phase-3-plan.md</code>). Auth, schema and RLS are live.
      </p>
    </section>
  );
}
