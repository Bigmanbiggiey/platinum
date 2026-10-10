import { useState } from 'react';
import { Button, Card, Input, Label, Labeled, Textarea } from '../../components/ui';
import { JobTimeline } from '../../../public/components/JobTimeline';
import { findings, parts, photos } from '../../lib/jobData';
import {
  defaultSummary,
  defaultTitle,
  pickCover,
  publishBlockers,
  usePublishedProject,
  usePublishJob,
  useUnpublishJob,
} from '../../lib/publishJob';
import { usePublish } from '../../lib/rebuild';
import { services, vehicles } from '../../lib/resources';
import type { JobWithRefs } from '../../lib/jobs';
import { jobSlug, toPublicTimeline } from '../../../shared/jobs/publicTimeline';

/**
 * Owner: put a completed, consented job on the website (jobs spec §5.5). The preview is
 * built with the same rules as the public `job_public` view, so it matches the live page.
 */
export function PublishCard({ job }: { job: JobWithRefs }) {
  const project = usePublishedProject(job.id);
  const service = services.useOne(job.service_id ?? undefined);
  const vehicle = vehicles.useOne(job.vehicle_id ?? undefined);
  const allFindings = findings.useList(job.id);
  const allParts = parts.useList(job.id);
  const allPhotos = photos.useList(job.id);
  const publishJob = usePublishJob(job.id);
  const unpublishJob = useUnpublishJob(job.id);
  const rebuild = usePublish();
  const [title, setTitle] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const blockers = publishBlockers(job);
  const p = project.data ?? null;
  const live = p?.is_published ?? false;
  const serviceTitle = service.data?.title ?? null;
  const slug =
    p?.slug ??
    jobSlug({
      vehicle_label: job.vehicle_label,
      service_title: serviceTitle,
      job_number: job.job_number,
    });
  const titleValue = title ?? p?.title ?? defaultTitle(job.vehicle_label, serviceTitle);
  const summaryValue = summary ?? p?.summary ?? defaultSummary(job.complaint, job.vehicle_label);
  const shownPhotos = (allPhotos.data ?? []).filter((x) => x.is_public).length;
  const error = publishJob.error ?? unpublishJob.error;

  const publish = () =>
    publishJob.mutate(
      {
        existingId: p?.id ?? null,
        slug,
        title: titleValue.trim(),
        summary: summaryValue.trim(),
        serviceId: job.service_id,
        completedAt: job.completed_at,
        coverMediaId: pickCover(allPhotos.data ?? []),
        vehicle: vehicle.data
          ? { make: vehicle.data.make, model: vehicle.data.model, year: vehicle.data.year }
          : null,
      },
      { onSuccess: () => rebuild.trigger() },
    );

  return (
    <Card className="space-y-3">
      <Label>Website (portfolio)</Label>
      {blockers.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[color:var(--color-muted)]">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : (
        <>
          <p className="text-sm text-[color:var(--color-ink)]">
            {live ? (
              <>
                On the website at{' '}
                <a
                  href={`/portfolio/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs underline"
                >
                  /portfolio/{slug}
                </a>
              </>
            ) : (
              'Not on the website yet.'
            )}
          </p>
          {shownPhotos === 0 && (
            <p className="text-xs text-signal">
              No photos are set to show on the website — the page will have no pictures.
            </p>
          )}
          <Labeled label="Title">
            <Input value={titleValue} onChange={(e) => setTitle(e.target.value)} />
          </Labeled>
          <Labeled label="Summary">
            <Textarea rows={2} value={summaryValue} onChange={(e) => setSummary(e.target.value)} />
          </Labeled>
          <p className="text-xs text-[color:var(--color-muted)]">
            Shown: the vehicle model, the complaint, problems, fixes, part names and photos not
            marked hidden. Never shown: the client, number plate, odometer, labour, costs or
            quantities.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPreview((v) => !v)}>
              {preview ? 'Hide preview' : 'Preview'}
            </Button>
            <Button
              variant="accent"
              disabled={
                publishJob.isPending || titleValue.trim() === '' || summaryValue.trim() === ''
              }
              onClick={publish}
            >
              {live ? 'Update website' : 'Publish to website'}
            </Button>
            {live && (
              <Button
                variant="danger"
                disabled={unpublishJob.isPending}
                onClick={() => {
                  if (confirm('Take this job off the website?')) {
                    unpublishJob.mutate(p!.id, { onSuccess: () => rebuild.trigger() });
                  }
                }}
              >
                Unpublish
              </Button>
            )}
          </div>
          {rebuild.message && (
            <p className="text-xs text-[color:var(--color-muted)]">{rebuild.message}</p>
          )}
          {error && <p className="text-xs text-signal">{(error as Error).message}</p>}
          {preview && (
            <div className="rounded border border-[color:var(--color-line)] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-steel">
                Preview — {titleValue}
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">{summaryValue}</p>
              <JobTimeline
                job={toPublicTimeline(
                  job,
                  allFindings.data ?? [],
                  allParts.data ?? [],
                  allPhotos.data ?? [],
                  { serviceTitle, slug },
                )}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
