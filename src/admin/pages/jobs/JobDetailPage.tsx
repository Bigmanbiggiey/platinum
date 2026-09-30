import { useParams } from 'react-router-dom';
import { EmptyState, PageTitle, Spinner } from '../../components/ui';
import { useJob } from '../../lib/jobData';

export function JobDetailPage() {
  const { id } = useParams();
  const q = useJob(id);
  if (q.isLoading) return <Spinner />;
  if (!q.data) return <EmptyState>Job not found.</EmptyState>;
  return <PageTitle>{`${q.data.job_number} · ${q.data.vehicle_label}`}</PageTitle>;
}
