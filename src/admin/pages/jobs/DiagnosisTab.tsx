import { useState } from 'react';
import { Button, Card, EmptyState, Input, Label, Labeled, Textarea } from '../../components/ui';
import { findings, photos } from '../../lib/jobData';
import type { JobFinding, JobPhoto, JobWithRefs } from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { usePhotoActions } from './usePhotoActions';

type PhotoActions = ReturnType<typeof usePhotoActions>;

export function DiagnosisTab({ job }: { job: JobWithRefs }) {
  const list = findings.useList(job.id);
  const create = findings.useCreate(job.id);
  const update = findings.useUpdate(job.id);
  const allPhotos = photos.useList(job.id);
  const actions = usePhotoActions(job);
  const [title, setTitle] = useState('');
  const rows = list.data ?? [];

  const add = () => {
    const last = rows[rows.length - 1];
    create.mutate(
      { title: title.trim(), display_order: (last?.display_order ?? 0) + 10 },
      { onSuccess: () => setTitle('') },
    );
  };

  // Swap display_order with the neighbour.
  const move = (index: number, dir: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    const aOrder = a.display_order === b.display_order ? b.display_order + dir : b.display_order;
    update.mutate({ id: a.id, patch: { display_order: aOrder } });
    update.mutate({ id: b.id, patch: { display_order: a.display_order } });
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && !list.isLoading && (
        <EmptyState>No problems logged yet. Add the first one below.</EmptyState>
      )}
      {rows.map((fd, i) => (
        <FindingCard
          key={`${fd.id}:${fd.title}:${fd.diagnosis ?? ''}`}
          jobId={job.id}
          finding={fd}
          photos={(allPhotos.data ?? []).filter(
            (p) => p.finding_id === fd.id && p.stage === 'diagnosis',
          )}
          actions={actions}
          moving={update.isPending}
          onUp={i > 0 ? () => move(i, -1) : undefined}
          onDown={i < rows.length - 1 ? () => move(i, 1) : undefined}
        />
      ))}
      {actions.error && <p className="text-xs text-signal">{actions.error}</p>}
      {update.isError && <p className="text-xs text-signal">{(update.error as Error).message}</p>}

      <Card>
        <Labeled label="Add a problem found">
          <div className="mt-1 flex gap-2">
            <Input
              className="mt-0"
              placeholder="e.g. Worn front brake pads"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) add();
              }}
            />
            <Button disabled={!title.trim() || create.isPending} onClick={add}>
              Add
            </Button>
          </div>
        </Labeled>
        {create.isError && (
          <p className="mt-2 text-xs text-signal">{(create.error as Error).message}</p>
        )}
      </Card>
    </div>
  );
}

function FindingCard({
  jobId,
  finding,
  photos: findingPhotos,
  actions,
  moving = false,
  onUp,
  onDown,
}: {
  jobId: string;
  finding: JobFinding;
  photos: JobPhoto[];
  actions: PhotoActions;
  moving?: boolean;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const update = findings.useUpdate(jobId);
  const remove = findings.useRemove(jobId);
  const [title, setTitle] = useState(finding.title);
  const [diagnosis, setDiagnosis] = useState(finding.diagnosis ?? '');
  const dirty = title !== finding.title || diagnosis !== (finding.diagnosis ?? '');

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Problem</Label>
        <div className="ml-auto flex gap-1 font-mono text-[10px]">
          <button
            type="button"
            aria-label="Move up"
            disabled={!onUp || moving}
            onClick={onUp}
            className="px-1 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={!onDown || moving}
            onClick={onDown}
            className="px-1 disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Problem title" />
      <Labeled label="Diagnosis — what you found and how">
        <Textarea rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </Labeled>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!dirty || !title.trim() || update.isPending}
          onClick={() =>
            update.mutate({
              id: finding.id,
              patch: { title: title.trim(), diagnosis: diagnosis.trim() || null },
            })
          }
        >
          Save
        </Button>
        <Button
          variant="danger"
          className="ml-auto"
          onClick={() => {
            if (
              confirm(`Delete "${finding.title}"? Its photos and parts stay on the job, unlinked.`)
            ) {
              remove.mutate(finding.id);
            }
          }}
        >
          Delete problem
        </Button>
      </div>
      {update.isError && <p className="text-xs text-signal">{(update.error as Error).message}</p>}
      {remove.isError && <p className="text-xs text-signal">{(remove.error as Error).message}</p>}
      <Label>Before photos</Label>
      <JobPhotos
        photos={findingPhotos}
        label="Add before photos"
        uploading={actions.uploading}
        onUpload={(files) => void actions.upload(files, 'diagnosis', finding)}
        onTogglePublic={actions.togglePublic}
        onDelete={actions.remove}
      />
    </Card>
  );
}
