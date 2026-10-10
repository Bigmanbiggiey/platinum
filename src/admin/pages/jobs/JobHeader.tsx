import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Input, Labeled, Select } from '../../components/ui';
import { useRole } from '../../auth/authContext';
import {
  useAssignablePeople,
  useAssignJob,
  useCreateClientForJob,
  useJobAssignees,
  useLinkJobClient,
  useUnassignJob,
  useUpdateJob,
} from '../../lib/jobData';
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

/** Client (owner only), registration, status, who is on it. Staff never see client details (D3). */
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
      <Assignees job={job} isOwner={isOwner} />
    </Card>
  );
}

/** Who is on the job — one person or a team (R-D D3). Everyone sees it; the owner edits. */
function Assignees({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
  const q = useJobAssignees(job.id);
  const people = useAssignablePeople(isOwner);
  const assign = useAssignJob(job.id);
  const unassign = useUnassignJob(job.id);
  const [pick, setPick] = useState('');
  const current = q.data ?? [];
  const available = (people.data ?? []).filter(
    (p) => !current.some((a) => a.user_id === p.user_id),
  );
  const error = assign.error ?? unassign.error;

  return (
    <div className="col-span-full">
      <span className={fieldLabel}>Assigned to</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {current.length === 0 && (
          <span className="text-sm text-[color:var(--color-muted)]">Nobody yet</span>
        )}
        {current.map((a) => {
          const name = a.display_name ?? 'Team member';
          return (
            <span
              key={a.user_id}
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] px-2.5 py-0.5 text-sm text-[color:var(--color-ink)]"
            >
              {name}
              {isOwner && (
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  disabled={unassign.isPending}
                  onClick={() => unassign.mutate(a.user_id)}
                  className="text-signal"
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
        {isOwner && available.length > 0 && (
          <span className="flex items-center gap-2">
            <Select
              aria-label="Assign someone"
              className="w-auto"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              <option value="">— add a person —</option>
              {available.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.display_name ?? p.email}
                  {p.role === 'owner' ? ' (owner)' : ''}
                </option>
              ))}
            </Select>
            <Button
              disabled={!pick || assign.isPending}
              onClick={() => {
                assign.mutate(pick);
                setPick('');
              }}
            >
              Assign
            </Button>
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-signal">{(error as Error).message}</p>}
    </div>
  );
}

/**
 * Owner: a walk-in checked in by staff has no client yet (RBAC D5). Link an existing
 * client, or create one here — the vehicle from check-in is attached to it (R-D D5).
 */
function LinkClient({ job }: { job: JobWithRefs }) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const tab = (m: typeof mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`font-mono text-[10px] uppercase tracking-widest ${
        mode === m ? 'text-[color:var(--color-ink)] underline' : 'text-[color:var(--color-muted)]'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="space-y-2">
      <p className="text-sm text-[color:var(--color-muted)]">Walk-in — no client yet.</p>
      <div className="flex gap-3">
        {tab('existing', 'Link existing')}
        {tab('new', 'New client')}
      </div>
      {mode === 'existing' ? <LinkExisting job={job} /> : <NewClient job={job} />}
    </div>
  );
}

function LinkExisting({ job }: { job: JobWithRefs }) {
  const list = clients.useList();
  const link = useLinkJobClient(job);
  const [clientId, setClientId] = useState('');
  return (
    <>
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
    </>
  );
}

function NewClient({ job }: { job: JobWithRefs }) {
  const create = useCreateClientForJob(job);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const vehicle = [job.vehicle_label, job.vehicle?.registration].filter(Boolean).join(' · ');
  return (
    <div className="space-y-2">
      <Input
        aria-label="Client name"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        aria-label="Client phone"
        type="tel"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Input
        aria-label="Client email"
        type="email"
        placeholder="Email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {job.vehicle_id && (
        <p className="text-xs text-[color:var(--color-muted)]">
          Vehicle from check-in: <span className="font-mono">{vehicle}</span> — added to this
          client.
        </p>
      )}
      <Button
        disabled={name.trim() === '' || create.isPending}
        onClick={() =>
          create.mutate({
            name: name.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
          })
        }
      >
        Create client
      </Button>
      {create.isError && <p className="text-xs text-signal">{(create.error as Error).message}</p>}
    </div>
  );
}
