import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, PageTitle, Spinner } from '../components/ui';
import { useMarkRead, useNotifications } from '../lib/notifications';

const linkFor = (entityType: string, entityId: string) =>
  entityType === 'service_request' ? `/admin/requests/${entityId}` : '/admin/content';

export function NotificationsPage() {
  const list = useNotifications();
  const mark = useMarkRead();
  const anyUnread = (list.data ?? []).some((n) => !n.read_at);

  return (
    <section>
      <PageTitle
        actions={
          anyUnread ? (
            <Button onClick={() => mark.all.mutate()} disabled={mark.all.isPending}>
              Mark all read
            </Button>
          ) : undefined
        }
      >
        Notifications
      </PageTitle>

      {list.isLoading ? (
        <Spinner />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState>Nothing yet. New enquiries, bookings and testimonials show up here.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {list.data!.map((n) => (
            <li
              key={n.id}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                n.read_at
                  ? 'border-[color:var(--color-line)] opacity-70'
                  : 'border-signal/40 bg-signal/5'
              }`}
            >
              <Badge tone={n.type === 'testimonial' ? 'neutral' : 'attention'}>{n.type}</Badge>
              <Link to={linkFor(n.entity_type, n.entity_id)} className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[color:var(--color-ink)]">{n.title}</p>
                {n.body && (
                  <p className="truncate text-sm text-[color:var(--color-muted)]">{n.body}</p>
                )}
              </Link>
              <span className="font-mono text-[10px] text-steel">
                {new Date(n.created_at).toLocaleString('en-KE', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
              {!n.read_at && (
                <button
                  type="button"
                  onClick={() => mark.one.mutate(n.id)}
                  className="font-mono text-[10px] uppercase tracking-widest text-platinum hover:text-paper"
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
