import { Badge, Button, Card, EmptyState, PageTitle, Spinner } from '../../components/ui';
import { testimonials } from '../../lib/resources';
import { usePublish } from '../../lib/rebuild';
import { ContentBackLink } from './ContentBackLink';

export function TestimonialsPage() {
  const list = testimonials.useList((rows) =>
    [...rows].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)),
  );
  const update = testimonials.useUpdate();
  const remove = testimonials.useRemove();
  const publish = usePublish();

  if (list.isLoading) return <Spinner />;

  const act = async (id: string, patch: Parameters<typeof update.mutateAsync>[0]['patch']) => {
    await update.mutateAsync({ id, patch });
    publish.trigger();
  };

  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Testimonials</PageTitle>
      {publish.message && <p className="text-sm text-teal">{publish.message}</p>}
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
              <span className="font-semibold text-[color:var(--color-ink)]">{t.first_name}</span>
              <span className="text-sm text-[color:var(--color-muted)]">· {t.vehicle_label}</span>
              {t.rating && <span className="text-signal">{'★'.repeat(t.rating)}</span>}
              <span className="ml-auto font-mono text-[10px] text-steel">
                {new Date(t.submitted_at).toLocaleDateString('en-KE')}
              </span>
            </div>
            <blockquote className="mt-2 text-[color:var(--color-ink)]">“{t.comment}”</blockquote>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.status !== 'approved' && (
                <Button variant="accent" onClick={() => act(t.id, { status: 'approved' })}>
                  Approve
                </Button>
              )}
              {t.status !== 'rejected' && (
                <Button onClick={() => act(t.id, { status: 'rejected' })}>Reject</Button>
              )}
              <Button onClick={() => act(t.id, { is_featured: !t.is_featured })}>
                {t.is_featured ? 'Unfeature' : 'Feature'}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (confirm('Delete this testimonial?')) {
                    await remove.mutateAsync(t.id);
                    publish.trigger();
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
