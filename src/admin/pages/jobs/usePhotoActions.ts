import { useState } from 'react';
import { photos, useAddPhoto } from '../../lib/jobData';
import {
  photoAlt,
  type Job,
  type JobFinding,
  type JobPhoto,
  type PhotoStage,
} from '../../lib/jobs';

/** Upload / show-hide / delete for a job's photos, shared by every tab. */
export function usePhotoActions(job: Pick<Job, 'id' | 'vehicle_label'>) {
  const add = useAddPhoto(job.id);
  const update = photos.useUpdate(job.id);
  const del = photos.useRemove(job.id);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    files: File[],
    stage: PhotoStage,
    finding: Pick<JobFinding, 'id' | 'title'> | null,
  ) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        await add.mutateAsync({
          file,
          stage,
          findingId: finding?.id ?? null,
          alt: photoAlt(job.vehicle_label, stage, finding?.title),
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onError = (e: unknown) => setError((e as Error).message);

  const togglePublic = (p: JobPhoto) => {
    setError(null);
    update.mutate({ id: p.id, patch: { is_public: !p.is_public } }, { onError });
  };

  const remove = (p: JobPhoto) => {
    if (confirm('Remove this photo from the job? It stays in the media library.')) {
      setError(null);
      del.mutate(p.id, { onError });
    }
  };

  return { upload, togglePublic, remove, uploading, error };
}
