import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label, Labeled } from '../../components/ui';
import { useRole } from '../../auth/authContext';
import {
  findings,
  parts,
  photos,
  useAddPart,
  useDeleteJob,
  useSaveLabour,
  useUpdateJob,
} from '../../lib/jobData';
import { formatKes, jobCostSummary, pendingFindingsCount, type JobWithRefs } from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { PartsEditor } from './PartsEditor';
import { usePhotoActions } from './usePhotoActions';

/** Costs, cancel and delete are owner-only (RBAC D3, D5); the database enforces it too. */
export function WrapUpTab({ job }: { job: JobWithRefs }) {
  const isOwner = useRole() === 'owner';
  const labourCost = job.job_cost?.labour_cost_kes ?? null;
  return (
    <div className="space-y-4">
      <LabourCard key={`${job.labour_hours}|${labourCost}`} job={job} isOwner={isOwner} />
      <UnlinkedCard job={job} isOwner={isOwner} />
      {isOwner && <CostSummary job={job} />}
      <StatusCard job={job} isOwner={isOwner} />
      {isOwner && <DeleteCard job={job} />}
    </div>
  );
}

function LabourCard({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
  const save = useSaveLabour(job.id);
  const [hours, setHours] = useState(job.labour_hours?.toString() ?? '');
  const [cost, setCost] = useState(job.job_cost?.labour_cost_kes?.toString() ?? '');
  const hoursValue = hours.trim() === '' ? null : Number(hours);
  return (
    <Card className="space-y-3">
      <div className={`grid gap-4 ${isOwner ? 'sm:grid-cols-2' : ''}`}>
        <Labeled label="Labour hours — private">
          <Input
            aria-label="Labour hours"
            type="number"
            min="0"
            step="0.25"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </Labeled>
        {isOwner && (
          <Labeled label="Labour cost (KES) — private">
            <Input
              aria-label="Labour cost (KES)"
              type="number"
              min="0"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </Labeled>
        )}
      </div>
      <Button
        disabled={save.isPending}
        onClick={() =>
          save.mutate(
            isOwner
              ? {
                  hours: hoursValue,
                  costKes: cost.trim() === '' ? null : Math.round(Number(cost)),
                }
              : { hours: hoursValue },
          )
        }
      >
        Save labour
      </Button>
      {save.isError && <p className="text-xs text-signal">{(save.error as Error).message}</p>}
    </Card>
  );
}

/** Photos and parts whose problem was deleted: still on the job, still costed, but shown nowhere else. */
function UnlinkedCard({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
  const allPhotos = photos.useList(job.id);
  const allParts = parts.useList(job.id);
  const addPart = useAddPart(job.id);
  const removePart = parts.useRemove(job.id);
  const actions = usePhotoActions(job);
  const loosePhotos = (allPhotos.data ?? []).filter(
    (p) => p.finding_id === null && p.stage !== 'check_in',
  );
  const looseParts = (allParts.data ?? []).filter((p) => p.finding_id === null);
  if (loosePhotos.length === 0 && looseParts.length === 0) return null;
  return (
    <Card className="space-y-3">
      <Label>Unlinked photos &amp; parts</Label>
      <p className="text-xs text-[color:var(--color-muted)]">
        These belonged to a problem that was deleted.
      </p>
      {loosePhotos.length > 0 && (
        <JobPhotos
          photos={loosePhotos}
          canUpload={false}
          onUpload={() => undefined}
          onTogglePublic={actions.togglePublic}
          onDelete={actions.remove}
        />
      )}
      {actions.error && <p className="text-xs text-signal">{actions.error}</p>}
      <PartsEditor
        parts={looseParts}
        busy={addPart.isPending}
        showCost={isOwner}
        onAdd={(p) => addPart.mutateAsync({ ...p, finding_id: null })}
        onRemove={(id) => removePart.mutate(id)}
      />
      {addPart.isError && <p className="text-xs text-signal">{(addPart.error as Error).message}</p>}
      {removePart.isError && (
        <p className="text-xs text-signal">{(removePart.error as Error).message}</p>
      )}
    </Card>
  );
}

function CostSummary({ job }: { job: JobWithRefs }) {
  const allParts = parts.useList(job.id);
  const s = jobCostSummary(job.job_cost?.labour_cost_kes ?? null, allParts.data ?? []);
  return (
    <Card>
      <Label>Cost summary — private, never shown on the website</Label>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
        <dt className="text-[color:var(--color-muted)]">Labour</dt>
        <dd className="text-right font-mono">{formatKes(s.labour)}</dd>
        <dt className="text-[color:var(--color-muted)]">Parts</dt>
        <dd className="text-right font-mono">{formatKes(s.parts)}</dd>
        <dt className="font-semibold text-[color:var(--color-ink)]">Total</dt>
        <dd className="text-right font-mono font-semibold">{formatKes(s.total)}</dd>
      </dl>
    </Card>
  );
}

function StatusCard({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
  const update = useUpdateJob(job.id);
  const list = findings.useList(job.id);
  const pending = pendingFindingsCount(list.data ?? []);

  const complete = () => {
    if (
      pending > 0 &&
      !confirm(`${pending} problem(s) still have no outcome. Mark the job completed anyway?`)
    ) {
      return;
    }
    update.mutate({ status: 'completed' });
  };

  return (
    <Card className="space-y-3">
      <Label>Job status</Label>
      {job.status === 'completed' ? (
        <>
          <p className="text-sm text-teal">
            ✓ Completed{' '}
            {job.completed_at &&
              new Date(job.completed_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
            .
          </p>
          <Button
            disabled={update.isPending}
            onClick={() => update.mutate({ status: 'in_repair' })}
          >
            Re-open job
          </Button>
        </>
      ) : job.status === 'cancelled' ? (
        <>
          <p className="text-sm text-[color:var(--color-muted)]">This job was cancelled.</p>
          {isOwner && (
            <Button
              disabled={update.isPending}
              onClick={() => update.mutate({ status: 'checked_in' })}
            >
              Re-open job
            </Button>
          )}
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" disabled={update.isPending} onClick={complete}>
            Mark completed
          </Button>
          {isOwner && (
            <Button
              variant="danger"
              disabled={update.isPending}
              onClick={() => {
                if (confirm('Cancel this job? It stays on file for history.')) {
                  update.mutate({ status: 'cancelled' });
                }
              }}
            >
              Cancel job
            </Button>
          )}
        </div>
      )}
      {update.isError && <p className="text-xs text-signal">{(update.error as Error).message}</p>}
      {isOwner && job.service_request_id && job.status !== 'completed' && (
        <p className="text-xs text-[color:var(--color-muted)]">
          Completing the job also marks its request completed.
        </p>
      )}
    </Card>
  );
}

function DeleteCard({ job }: { job: JobWithRefs }) {
  const del = useDeleteJob();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        disabled={del.isPending}
        onClick={async () => {
          if (
            confirm(
              `Delete job ${job.job_number}? Its problems, photo links and parts are removed. Photos stay in the media library.`,
            )
          ) {
            setError(null);
            try {
              await del.mutateAsync(job.id);
            } catch (e) {
              setError((e as Error).message);
              return;
            }
            navigate('/admin/jobs');
          }
        }}
      >
        Delete job
      </Button>
      {error && <p className="text-xs text-signal">{error}</p>}
    </div>
  );
}
