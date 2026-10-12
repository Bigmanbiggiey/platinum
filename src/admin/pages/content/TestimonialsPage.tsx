import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, PageTitle, Spinner } from '../../components/ui';
import { testimonials, type AdminTestimonial } from '../../lib/resources';
import { usePublish } from '../../lib/rebuild';
import { isOnWebsite } from '../../lib/publishJob';

/** Where a testimonial came from (J3). */
const SOURCE_LABEL: Record<string, string> = {
  review_link: 'Review link',
  owner_entered: 'Added by owner',
  public_form: 'Website form',
  seed: 'Starter content',
};
import { ContentBackLink } from './ContentBackLink';

export function TestimonialsPage() {
  const list = testimonials.useList((rows) =>
    [...rows].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)),
  );
  const update = testimonials.useUpdate();
  const remove = testimonials.useRemove();
  const publish = usePublish();

  if (list.isLoading) return <Spinner />;

  /** A review on a job that is on the website goes live at once; the rest batch up. */
  const republish = async (t: AdminTestimonial) => {
    if (t.job_id && (await isOnWebsite(t.job_id))) {
      publish.triggerNow();
    } else {
      publish.trigger();
    }
  };

  const act = async (
    t: AdminTestimonial,
    patch: Parameters<typeof update.mutateAsync>[0]['patch'],
  ) => {
    await update.mutateAsync({ id: t.id, patch });
    await republish(t);
  };

  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Testimonials</PageTitle>
      {publish.message && (
        <p className="text-sm text-[color:var(--color-confirm-text)]">{publish.message}</p>
      )}
      {(list.data ?? []).length === 0 ? (
        <EmptyState>No testimonials submitted yet.</EmptyState>
      ) : (
        list.data!.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  t.status === 'approved' ? 'pass' : t.status === 'pending' ? 'attention' : 'muted'
                }
              >
                {t.status}
              </Badge>
              {t.is_featured && <Badge tone="neutral">featured</Badge>}
              {SOURCE_LABEL[t.source] && <Badge tone="muted">{SOURCE_LABEL[t.source]}</Badge>}
              {t.job_id && t.job && (
                <Link
                  to={`/admin/jobs/${t.job_id}?tab=wrap-up`}
                  className="font-mono text-xs underline"
                >
                  {t.job.job_number}
                </Link>
              )}
              <span className="font-semibold text-[color:var(--color-ink)]">{t.first_name}</span>
              <span className="text-sm text-[color:var(--color-muted)]">· {t.vehicle_label}</span>
              {t.rating && (
                <span className="text-[color:var(--color-accent-text)]">
                  {'★'.repeat(t.rating)}
                </span>
              )}
              <span className="ml-auto font-mono text-[10px] text-[color:var(--color-muted)]">
                {new Date(t.submitted_at).toLocaleDateString('en-KE')}
              </span>
            </div>
            <blockquote className="mt-2 text-[color:var(--color-ink)]">“{t.comment}”</blockquote>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.status !== 'approved' && (
                <Button variant="accent" onClick={() => act(t, { status: 'approved' })}>
                  Approve
                </Button>
              )}
              {t.status !== 'rejected' && (
                <Button onClick={() => act(t, { status: 'rejected' })}>Reject</Button>
              )}
              <Button onClick={() => act(t, { is_featured: !t.is_featured })}>
                {t.is_featured ? 'Unfeature' : 'Feature'}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (confirm('Delete this testimonial?')) {
                    await remove.mutateAsync(t.id);
                    await republish(t);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))
      )}
    </section>
  );
}
