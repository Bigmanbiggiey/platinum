import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label, Labeled, Textarea } from '../../components/ui';
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
import {
  formatKes,
  jobCostSummary,
  pendingFindingsCount,
  reviewSummary,
  type JobWithRefs,
} from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { PartsEditor } from './PartsEditor';
import { PublishCard } from './PublishCard';
import { usePublishedProject } from '../../lib/publishJob';
import { getDb } from '../../lib/db';
import { usePhotoActions } from './usePhotoActions';

/**
 * Costs, cancel and delete are owner-only (RBAC D3, D5); staff submit for review and the
 * owner approves or sends back (R-D D1, D2). The database enforces all of it.
 */
export function WrapUpTab({ job }: { job: JobWithRefs }) {
  const isOwner = useRole() === 'owner';
  const labourCost = job.job_cost?.labour_cost_kes ?? null;
  return (
    <div className="space-y-4">
      <LabourCard key={`${job.labour_hours}|${labourCost}`} job={job} isOwner={isOwner} />
      <UnlinkedCard job={job} isOwner={isOwner} />
      {isOwner && <CostSummary job={job} />}
      {job.review_note && job.status !== 'completed' && <SentBackNote note={job.review_note} />}
      {isOwner && job.status === 'awaiting_review' ? (
        <ReviewCard job={job} />
      ) : (
        <StatusCard job={job} isOwner={isOwner} />
      )}
      {isOwner && <PublishCard job={job} />}
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
      {actions.notice && (
        <p className="text-xs text-[color:var(--color-muted)]">{actions.notice}</p>
      )}
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

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { dateStyle: 'medium' }) : '';

/** The owner's send-back note, shown until the owner approves (R-D D2). */
function SentBackNote({ note }: { note: string }) {
  return (
    <Card className="space-y-1 border-signal/50 bg-signal/10">
      <Label>Sent back by the owner</Label>
      <p className="whitespace-pre-line text-sm text-[color:var(--color-ink)]">{note}</p>
    </Card>
  );
}

/** Owner, job awaiting review: check the work, then approve or send it back (R-D D2). */
function ReviewCard({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  const list = findings.useList(job.id);
  const allParts = parts.useList(job.id);
  const allPhotos = photos.useList(job.id);
  const [note, setNote] = useState('');
  const s = reviewSummary(list.data ?? [], allParts.data ?? [], allPhotos.data ?? []);

  const approve = () => {
    if (
      s.pending > 0 &&
      !confirm(`${s.pending} problem(s) still have no outcome. Approve and complete anyway?`)
    ) {
      return;
    }
    update.mutate({ status: 'completed' });
  };

  return (
    <Card className="space-y-3">
      <Label>Review — submitted {when(job.submitted_at)}</Label>
      <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
        <dt className="text-[color:var(--color-muted)]">Problems</dt>
        <dd className="text-right font-mono">
          {s.problems} · {s.fixed} fixed · {s.deferred} deferred · {s.notFixed} not fixed
          {s.pending > 0 ? ` · ${s.pending} pending` : ''}
        </dd>
        <dt className="text-[color:var(--color-muted)]">Parts</dt>
        <dd className="text-right font-mono">{s.parts}</dd>
        <dt className="text-[color:var(--color-muted)]">Labour hours</dt>
        <dd className="text-right font-mono">{job.labour_hours ?? '—'}</dd>
        <dt className="text-[color:var(--color-muted)]">After photos</dt>
        <dd className="text-right font-mono">{s.afterPhotos}</dd>
      </dl>
      <p className="text-xs text-[color:var(--color-muted)]">
        Check the Diagnosis and Repair tabs for the details, then approve or send it back.
      </p>
      <Button variant="accent" disabled={update.isPending} onClick={approve}>
        Approve &amp; complete
      </Button>
      <Labeled label="Send back with a note">
        <Textarea
          aria-label="Send-back note"
          rows={2}
          placeholder="What still needs doing?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Labeled>
      <Button
        variant="danger"
        disabled={update.isPending || note.trim() === ''}
        onClick={() => update.mutate({ status: 'in_repair', review_note: note.trim() })}
      >
        Send back
      </Button>
      {update.isError && <p className="text-xs text-signal">{(update.error as Error).message}</p>}
      {job.service_request_id && (
        <p className="text-xs text-[color:var(--color-muted)]">
          Approving also marks its request completed.
        </p>
      )}
    </Card>
  );
}

function StatusCard({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
  const update = useUpdateJob(job.id);
  const list = findings.useList(job.id);
  const pending = pendingFindingsCount(list.data ?? []);

  /** Owner completes directly; staff submit for review (R-D D1). */
  const finish = () => {
    const verb = isOwner ? 'Mark the job completed' : 'Submit it for review';
    if (pending > 0 && !confirm(`${pending} problem(s) still have no outcome. ${verb} anyway?`)) {
      return;
    }
    update.mutate({ status: isOwner ? 'completed' : 'awaiting_review' });
  };

  return (
    <Card className="space-y-3">
      <Label>Job status</Label>
      {job.status === 'completed' ? (
        <>
          <p className="text-sm text-teal">✓ Completed {when(job.completed_at)}.</p>
          {isOwner && (
            <Button
              disabled={update.isPending}
              onClick={() => update.mutate({ status: 'in_repair' })}
            >
              Re-open job
            </Button>
          )}
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
      ) : job.status === 'awaiting_review' ? (
        <p className="text-sm text-[color:var(--color-muted)]">
          Submitted for review {when(job.submitted_at)} — waiting for the owner.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" disabled={update.isPending} onClick={finish}>
            {isOwner ? 'Mark completed' : 'Submit for review'}
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
  const project = usePublishedProject(job.id);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // A job on the website can't be deleted (J2: on delete restrict) — unpublish first.
  if (project.data?.is_published) {
    return (
      <p className="text-xs text-[color:var(--color-muted)]">
        This job is on the website. Unpublish it in the Website card before deleting it.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        disabled={del.isPending || project.isLoading}
        onClick={async () => {
          if (
            confirm(
              `Delete job ${job.job_number}? Its problems, photo links and parts are removed. Photos stay in the media library.`,
            )
          ) {
            setError(null);
            try {
              // An unpublished entry is kept for a stable web address; remove it with the job.
              if (project.data) {
                const { error: pErr } = await getDb()
                  .from('portfolio_project')
                  .delete()
                  .eq('id', project.data.id);
                if (pErr) throw pErr;
              }
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
