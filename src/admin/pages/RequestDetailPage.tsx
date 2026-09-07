import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Label,
  Labeled,
  PageTitle,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { useConvertToClient, useRequest, useUpdateRequest } from '../lib/requests';
import { STATUSES, prettyType, statusTone } from '../lib/db';

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="py-1.5">
      <Label>{label}</Label>
      <p className="text-[color:var(--color-ink)]">{value}</p>
    </div>
  );
}

export function RequestDetailPage() {
  const { id } = useParams();
  const q = useRequest(id);
  const update = useUpdateRequest(id!);
  const r = q.data;
  const convert = useConvertToClient(r ?? ({} as never));

  const [internal, setInternal] = useState('');
  const [outcome, setOutcome] = useState('');
  useEffect(() => {
    if (r) {
      setInternal(r.internal_notes ?? '');
      setOutcome(r.outcome_notes ?? '');
    }
  }, [r]);

  if (q.isLoading) return <Spinner />;
  if (!r) return <EmptyState>Request not found.</EmptyState>;

  return (
    <section className="space-y-6">
      <PageTitle
        actions={
          <Link
            to="/admin/requests"
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            ← All requests
          </Link>
        }
      >
        {r.contact_name}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            <Badge tone="neutral">{prettyType(r.request_type)}</Badge>
            <span className="ml-auto font-mono text-[10px] text-steel">
              {new Date(r.created_at).toLocaleString('en-KE')}
            </span>
          </div>
          <Row label="Phone" value={<span className="font-mono">{r.contact_phone}</span>} />
          <Row
            label="WhatsApp"
            value={r.contact_whatsapp && <span className="font-mono">{r.contact_whatsapp}</span>}
          />
          <Row label="Email" value={r.contact_email} />
          <Row label="Area" value={r.area} />
          <Row label="Vehicle" value={r.vehicle_description} />
          <Row
            label="Requested"
            value={
              r.requested_date &&
              `${r.requested_date}${r.requested_time_window ? ` · ${r.requested_time_window}` : ''}`
            }
          />
          <Row
            label="Confirmed at"
            value={r.confirmed_at && new Date(r.confirmed_at).toLocaleString('en-KE')}
          />
          <Row
            label="Message"
            value={r.message && <span className="whitespace-pre-wrap">{r.message}</span>}
          />
          <Row label="Source" value={<span className="font-mono text-xs">{r.source}</span>} />
        </Card>

        <div className="space-y-4">
          <Card>
            <Labeled label="Status">
              <Select
                value={r.status}
                onChange={(e) => update.mutate({ status: e.target.value as never })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Labeled>
          </Card>

          <Card>
            <Label>Customer</Label>
            {r.client_id ? (
              <p className="mt-1 text-sm text-teal">✓ Linked to a client.</p>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-[color:var(--color-muted)]">Not yet a client on file.</p>
                <div className="flex gap-2">
                  <Button
                    variant="accent"
                    disabled={convert.isPending}
                    onClick={() => convert.mutate({ createVehicle: true })}
                  >
                    Convert to client + vehicle
                  </Button>
                  <Button
                    disabled={convert.isPending}
                    onClick={() => convert.mutate({ createVehicle: false })}
                  >
                    Client only
                  </Button>
                </div>
                {convert.isError && (
                  <p className="text-xs text-signal">{(convert.error as Error).message}</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Labeled label="Internal notes">
            <Textarea value={internal} onChange={(e) => setInternal(e.target.value)} rows={4} />
          </Labeled>
          <Button
            className="mt-2"
            disabled={update.isPending || internal === (r.internal_notes ?? '')}
            onClick={() => update.mutate({ internal_notes: internal })}
          >
            Save notes
          </Button>
        </Card>
        <Card>
          <Labeled label="Outcome">
            <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={4} />
          </Labeled>
          <Button
            className="mt-2"
            disabled={update.isPending || outcome === (r.outcome_notes ?? '')}
            onClick={() => update.mutate({ outcome_notes: outcome })}
          >
            Save outcome
          </Button>
        </Card>
      </div>
    </section>
  );
}
