import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Label, Labeled, Select, Textarea } from '../../components/ui';
import { useRole } from '../../auth/authContext';
import { findings, parts, photos, useAddPart } from '../../lib/jobData';
import {
  FINDING_OUTCOMES,
  outcomeLabel,
  type FindingOutcome,
  type JobFinding,
  type JobPart,
  type JobPhoto,
  type JobWithRefs,
} from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { PartsEditor } from './PartsEditor';
import { usePhotoActions } from './usePhotoActions';
import { AUTO_ADVANCE_MS, repairComplete } from '../../lib/jobFlow';
import { StepDone } from './StepDone';
import { useStepFlow, useUnsaved } from './stepFlow';

type PhotoActions = ReturnType<typeof usePhotoActions>;

export function RepairTab({ job }: { job: JobWithRefs }) {
  const list = findings.useList(job.id);
  const allPhotos = photos.useList(job.id);
  const allParts = parts.useList(job.id);
  const actions = usePhotoActions(job);
  const isOwner = useRole() === 'owner';
  const rows = list.data ?? [];
  const flow = useStepFlow();
  // Set by a "Save repair"; once the saved outcomes leave nothing pending, move on.
  const [justSaved, setJustSaved] = useState(false);
  const complete = repairComplete(rows);
  const countdown = justSaved && complete && flow?.autoAdvance === true;

  if (!list.isLoading && rows.length === 0) {
    return <EmptyState>Log the problems you found in the Diagnosis tab first.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {rows.map((fd) => (
        <RepairCard
          key={`${fd.id}:${fd.fix ?? ''}:${fd.outcome}`}
          jobId={job.id}
          finding={fd}
          photos={(allPhotos.data ?? []).filter(
            (p) => p.finding_id === fd.id && p.stage === 'repair',
          )}
          parts={(allParts.data ?? []).filter((p) => p.finding_id === fd.id)}
          actions={actions}
          showCost={isOwner}
          onSaved={() => setJustSaved(true)}
        />
      ))}
      {actions.error && (
        <p className="text-xs text-[color:var(--color-accent-text)]">{actions.error}</p>
      )}
      {actions.notice && (
        <p className="text-xs text-[color:var(--color-muted)]">{actions.notice}</p>
      )}
      {countdown && flow && (
        <RepairDoneBanner
          onGo={() => {
            setJustSaved(false);
            void flow.finish('repair');
          }}
          onStay={() => setJustSaved(false)}
        />
      )}
      <StepDone
        step="repair"
        disabled={!complete}
        hint="Set an outcome other than Pending for every problem first."
      />
    </div>
  );
}

/** "Repair done — going to Wrap-up", with a way to stay. */
function RepairDoneBanner({ onGo, onStay }: { onGo: () => void; onStay: () => void }) {
  useEffect(() => {
    const t = setTimeout(onGo, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
    // Start once per banner; a re-render must not restart the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-teal/40 bg-teal/10 p-4 text-sm"
    >
      <span className="text-[color:var(--color-ink)]">
        Every problem has an outcome — going to Wrap-up…
      </span>
      <span className="ml-auto flex gap-2">
        <Button onClick={onStay}>Stay here</Button>
        <Button variant="accent" onClick={onGo}>
          Go now
        </Button>
      </span>
    </div>
  );
}

function RepairCard({
  jobId,
  finding,
  photos: afterPhotos,
  parts: findingParts,
  actions,
  showCost,
  onSaved,
}: {
  jobId: string;
  finding: JobFinding;
  photos: JobPhoto[];
  parts: JobPart[];
  actions: PhotoActions;
  showCost: boolean;
  onSaved: () => void;
}) {
  const update = findings.useUpdate(jobId);
  const addPart = useAddPart(jobId);
  const removePart = parts.useRemove(jobId);
  const [fix, setFix] = useState(finding.fix ?? '');
  const [outcome, setOutcome] = useState<FindingOutcome>(finding.outcome);
  const dirty = fix !== (finding.fix ?? '') || outcome !== finding.outcome;
  useUnsaved(`repair:${finding.id}`, dirty);

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-semibold text-[color:var(--color-ink)]">{finding.title}</h3>
        {finding.diagnosis && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--color-muted)]">
            {finding.diagnosis}
          </p>
        )}
      </div>
      <Labeled label="Fix — what was done">
        <Textarea rows={3} value={fix} onChange={(e) => setFix(e.target.value)} />
      </Labeled>
      <Labeled label="Outcome">
        <Select value={outcome} onChange={(e) => setOutcome(e.target.value as FindingOutcome)}>
          {FINDING_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {outcomeLabel[o]}
            </option>
          ))}
        </Select>
      </Labeled>
      <Button
        disabled={!dirty || update.isPending}
        onClick={() =>
          update.mutate(
            { id: finding.id, patch: { fix: fix.trim() || null, outcome } },
            { onSuccess: onSaved },
          )
        }
      >
        Save repair
      </Button>
      {update.isError && (
        <p className="text-xs text-[color:var(--color-accent-text)]">
          {(update.error as Error).message}
        </p>
      )}

      <Label>After photos</Label>
      <JobPhotos
        photos={afterPhotos}
        label="Add after photos"
        uploading={actions.uploading}
        onUpload={(files) => void actions.upload(files, 'repair', finding)}
        onTogglePublic={actions.togglePublic}
        onDelete={actions.remove}
      />

      <Label>Parts used</Label>
      <PartsEditor
        parts={findingParts}
        busy={addPart.isPending}
        showCost={showCost}
        onAdd={(p) => addPart.mutateAsync({ ...p, finding_id: finding.id })}
        onRemove={(id) => removePart.mutate(id)}
      />
      {addPart.isError && (
        <p className="text-xs text-[color:var(--color-accent-text)]">
          {(addPart.error as Error).message}
        </p>
      )}
      {removePart.isError && (
        <p className="text-xs text-[color:var(--color-accent-text)]">
          {(removePart.error as Error).message}
        </p>
      )}
    </Card>
  );
}
