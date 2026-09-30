import { useState } from 'react';
import { Button, Card, EmptyState, Label, Labeled, Select, Textarea } from '../../components/ui';
import { findings, parts, photos } from '../../lib/jobData';
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

type PhotoActions = ReturnType<typeof usePhotoActions>;

export function RepairTab({ job }: { job: JobWithRefs }) {
  const list = findings.useList(job.id);
  const allPhotos = photos.useList(job.id);
  const allParts = parts.useList(job.id);
  const actions = usePhotoActions(job);
  const rows = list.data ?? [];

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
        />
      ))}
      {actions.error && <p className="text-xs text-signal">{actions.error}</p>}
    </div>
  );
}

function RepairCard({
  jobId,
  finding,
  photos: afterPhotos,
  parts: findingParts,
  actions,
}: {
  jobId: string;
  finding: JobFinding;
  photos: JobPhoto[];
  parts: JobPart[];
  actions: PhotoActions;
}) {
  const update = findings.useUpdate(jobId);
  const addPart = parts.useCreate(jobId);
  const removePart = parts.useRemove(jobId);
  const [fix, setFix] = useState(finding.fix ?? '');
  const [outcome, setOutcome] = useState<FindingOutcome>(finding.outcome);
  const dirty = fix !== (finding.fix ?? '') || outcome !== finding.outcome;

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
          update.mutate({ id: finding.id, patch: { fix: fix.trim() || null, outcome } })
        }
      >
        Save repair
      </Button>

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
        onAdd={(p) => addPart.mutate({ ...p, finding_id: finding.id })}
        onRemove={(id) => removePart.mutate(id)}
      />
    </Card>
  );
}
