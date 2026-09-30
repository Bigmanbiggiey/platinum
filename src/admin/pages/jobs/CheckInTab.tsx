import { useState } from 'react';
import { Button, Card, Input, Label, Labeled, Textarea } from '../../components/ui';
import { photos, useUpdateJob } from '../../lib/jobData';
import { fromDateInput, toDateInput, type JobWithRefs } from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { usePhotoActions } from './usePhotoActions';

export function CheckInTab({ job }: { job: JobWithRefs }) {
  // Remount the form when the saved values change, so it never shows stale data.
  const formKey = [
    job.vehicle_label,
    job.booked_at,
    job.checked_in_at,
    job.odometer_km,
    job.complaint,
    job.internal_notes,
  ].join('|');
  return (
    <div className="space-y-4">
      <ConsentCard job={job} />
      <CheckInForm key={formKey} job={job} />
      <CheckInPhotos job={job} />
    </div>
  );
}

function ConsentCard({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  return (
    <Card>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={job.public_consent}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ public_consent: e.target.checked })}
        />
        <span>
          <span className="font-semibold text-[color:var(--color-ink)]">
            Client agrees to this job being shown on our website
          </span>
          <span className="block text-xs text-[color:var(--color-muted)]">
            Their name, phone and number plate are never shown.
            {job.consent_recorded_at &&
              ` Recorded ${new Date(job.consent_recorded_at).toLocaleString('en-KE')}.`}
          </span>
        </span>
      </label>
    </Card>
  );
}

function CheckInForm({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  const [f, setF] = useState({
    vehicle_label: job.vehicle_label,
    booked: toDateInput(job.booked_at),
    checkedIn: toDateInput(job.checked_in_at),
    odometer: job.odometer_km?.toString() ?? '',
    complaint: job.complaint ?? '',
    internal: job.internal_notes ?? '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () =>
    update.mutate({
      vehicle_label: f.vehicle_label.trim() || job.vehicle_label,
      booked_at: fromDateInput(f.booked),
      // Keep the original time of day unless the date itself was changed.
      checked_in_at:
        f.checkedIn === toDateInput(job.checked_in_at)
          ? job.checked_in_at
          : (fromDateInput(f.checkedIn) ?? job.checked_in_at),
      odometer_km: f.odometer.trim() === '' ? null : Math.round(Number(f.odometer)),
      complaint: f.complaint.trim() || null,
      internal_notes: f.internal.trim() || null,
    });

  return (
    <Card className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Vehicle (as shown on the job)" hint="Make, model, year — no number plate.">
          <Input value={f.vehicle_label} onChange={set('vehicle_label')} />
        </Labeled>
        <Labeled label="Odometer (km) — private">
          <Input
            type="number"
            min="0"
            inputMode="numeric"
            value={f.odometer}
            onChange={set('odometer')}
          />
        </Labeled>
        <Labeled label="Booked for">
          <Input type="date" value={f.booked} onChange={set('booked')} />
        </Labeled>
        <Labeled label="Checked in">
          <Input type="date" value={f.checkedIn} onChange={set('checkedIn')} />
        </Labeled>
      </div>
      <Labeled label="Customer's complaint">
        <Textarea rows={3} value={f.complaint} onChange={set('complaint')} />
      </Labeled>
      <Labeled label="Internal notes — private">
        <Textarea rows={3} value={f.internal} onChange={set('internal')} />
      </Labeled>
      <Button variant="accent" disabled={update.isPending} onClick={save}>
        Save check-in
      </Button>
      {update.isError && <p className="text-xs text-signal">{(update.error as Error).message}</p>}
    </Card>
  );
}

function CheckInPhotos({ job }: { job: JobWithRefs }) {
  const all = photos.useList(job.id);
  const actions = usePhotoActions(job);
  const checkIn = (all.data ?? []).filter((p) => p.stage === 'check_in');
  return (
    <Card>
      <Label>Check-in photos</Label>
      <div className="mt-2">
        <JobPhotos
          photos={checkIn}
          label="Add check-in photos"
          uploading={actions.uploading}
          onUpload={(files) => void actions.upload(files, 'check_in', null)}
          onTogglePublic={actions.togglePublic}
          onDelete={actions.remove}
        />
      </div>
      {actions.error && <p className="mt-2 text-xs text-signal">{actions.error}</p>}
    </Card>
  );
}
