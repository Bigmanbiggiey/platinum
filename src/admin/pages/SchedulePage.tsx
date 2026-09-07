import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageTitle,
  Spinner,
} from '../components/ui';
import { getDb, prettyType, type ServiceRequest } from '../lib/db';
import { useUpdateRequest } from '../lib/requests';

function useScheduleItems() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: async (): Promise<ServiceRequest[]> => {
      const { data, error } = await getDb()
        .from('service_request')
        .select('*')
        .or('request_type.eq.booking,status.eq.scheduled')
        .not('status', 'in', '(closed,archived,spam,completed)')
        .order('requested_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });
}

function ScheduleRow({ r }: { r: ServiceRequest }) {
  const update = useUpdateRequest(r.id);
  const [date, setDate] = useState(r.requested_date ?? '');

  const confirm = () =>
    update.mutate({
      status: 'scheduled',
      requested_date: date || r.requested_date,
      confirmed_at: new Date().toISOString(),
    });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={r.confirmed_at ? 'pass' : 'attention'}>
          {r.confirmed_at ? 'confirmed' : 'to confirm'}
        </Badge>
        <Badge tone="neutral">{prettyType(r.request_type)}</Badge>
        <Link
          to={`/admin/requests/${r.id}`}
          className="font-semibold underline-offset-2 hover:underline"
        >
          {r.contact_name}
        </Link>
        <span className="font-mono text-[11px] text-steel">{r.contact_phone}</span>
        {r.area && <span className="text-sm text-[color:var(--color-muted)]">· {r.area}</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </label>
        {r.requested_time_window && (
          <span className="pb-2 text-sm text-[color:var(--color-muted)]">
            {r.requested_time_window}
          </span>
        )}
        <Button variant="accent" onClick={confirm} disabled={update.isPending}>
          {r.confirmed_at ? 'Re-confirm' : 'Confirm'}
        </Button>
        <Button
          variant="danger"
          onClick={() => update.mutate({ status: 'closed' })}
          disabled={update.isPending}
        >
          Decline
        </Button>
      </div>
      <p className="mt-2 text-xs text-steel">
        Customer confirmation email is wired in WP11 (needs a Resend key).
      </p>
    </Card>
  );
}

export function SchedulePage() {
  const q = useScheduleItems();
  return (
    <section className="space-y-4">
      <PageTitle>Schedule</PageTitle>
      {q.isLoading ? (
        <Spinner />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState>No bookings to confirm.</EmptyState>
      ) : (
        <div className="space-y-3">
          {q.data!.map((r) => (
            <ScheduleRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </section>
  );
}
