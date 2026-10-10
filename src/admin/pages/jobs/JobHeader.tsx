import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Labeled, Select } from '../../components/ui';
import { useRole } from '../../auth/authContext';
import { useLinkJobClient, useUpdateJob } from '../../lib/jobData';
import { clients } from '../../lib/resources';
import {
  jobStatusLabel,
  jobStatusOptions,
  jobStatusTone,
  type JobStatus,
  type JobWithRefs,
} from '../../lib/jobs';

const fieldLabel =
  'font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]';

/** Client (owner only), registration, status. Staff never see client details (D3). */
export function JobHeader({ job }: { job: JobWithRefs }) {
  const isOwner = useRole() === 'owner';
  const update = useUpdateJob(job.id);
  const options = jobStatusOptions(job.status, isOwner);

  return (
    <Card
      className={`grid gap-4 ${isOwner ? 'sm:grid-cols-[1fr_1fr_14rem]' : 'sm:grid-cols-[1fr_14rem]'}`}
    >
      {isOwner && (
        <div>
          <span className={fieldLabel}>Client</span>
          {job.client_id ? (
            <p className="text-[color:var(--color-ink)]">
              <Link
                to={`/admin/clients/${job.client_id}`}
                className="underline-offset-2 hover:underline"
              >
                {job.client?.name ?? 'Client'}
              </Link>
            </p>
          ) : (
            <LinkClient job={job} />
          )}
        </div>
      )}
      <div>
        <span className={fieldLabel}>Registration</span>
        <p className="font-mono text-[color:var(--color-ink)]">
          {job.vehicle?.registration ?? '—'}
        </p>
      </div>
      <Labeled label="Status">
        <div className="flex items-center gap-2">
          <Select
            aria-label="Status"
            value={job.status}
            disabled={update.isPending || options.length < 2}
            onChange={(e) => update.mutate({ status: e.target.value as JobStatus })}
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {jobStatusLabel[s]}
              </option>
            ))}
          </Select>
          <Badge tone={jobStatusTone(job.status)}>{jobStatusLabel[job.status]}</Badge>
        </div>
        {update.isError && (
          <p className="mt-1 text-xs text-signal">{(update.error as Error).message}</p>
        )}
      </Labeled>
    </Card>
  );
}

/** Owner: attach a client to a walk-in checked in by staff (D5). */
function LinkClient({ job }: { job: JobWithRefs }) {
  const list = clients.useList();
  const link = useLinkJobClient(job);
  const [clientId, setClientId] = useState('');
  return (
    <div className="space-y-2">
      <p className="text-sm text-[color:var(--color-muted)]">Walk-in — no client yet.</p>
      <div className="flex items-end gap-2">
        <Select
          aria-label="Link a client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">— pick a client —</option>
          {(list.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` · ${c.phone}` : ''}
            </option>
          ))}
        </Select>
        <Button disabled={!clientId || link.isPending} onClick={() => link.mutate(clientId)}>
          Link
        </Button>
      </div>
      {link.isError && <p className="text-xs text-signal">{(link.error as Error).message}</p>}
    </div>
  );
}
