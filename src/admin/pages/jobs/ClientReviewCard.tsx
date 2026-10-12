import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Input, Label, Labeled, Select, Textarea } from '../../components/ui';
import { clients } from '../../lib/resources';
import type { JobWithRefs } from '../../lib/jobs';
import {
  inviteState,
  reviewMessage,
  reviewUrl,
  useAddOwnerTestimonial,
  useCreateReviewInvite,
  useJobTestimonials,
  useLatestReviewInvite,
  waNumber,
  whatsappTo,
} from '../../lib/reviews';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { dateStyle: 'medium' });

/**
 * Owner, completed job: ask the client for a review with a one-time link, or add their
 * words for them (jobs spec D4, §5.4). The link is shown once — only its hash is kept.
 */
export function ClientReviewCard({ job }: { job: JobWithRefs }) {
  const invite = useLatestReviewInvite(job.id);
  const reviews = useJobTestimonials(job.id);
  const client = clients.useOne(job.client_id ?? undefined);
  const create = useCreateReviewInvite(job.id);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);

  const state = inviteState(invite.data ?? null);
  const clientName = client.data?.name ?? job.client?.name ?? '';
  const number = waNumber(client.data?.whatsapp ?? client.data?.phone);

  const makeLink = async () => {
    if (
      state.kind === 'sent' &&
      !confirm('Make a new link? The link you sent earlier will stop working.')
    ) {
      return;
    }
    setCopied(false);
    const code = await create.mutateAsync();
    setUrl(reviewUrl(window.location.origin, code));
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="space-y-3">
      <Label>Client review</Label>
      <p className="text-sm text-[color:var(--color-muted)]">
        {state.kind === 'none' && 'No review link yet.'}
        {state.kind === 'sent' &&
          `Link made ${day(state.sentAt)} — works until ${day(state.expiresAt)}, once.`}
        {state.kind === 'used' && `Review received ${day(state.usedAt)}.`}
        {state.kind === 'expired' && 'The last link has expired or was replaced.'}
      </p>

      {url ? (
        <div className="space-y-2 rounded border border-[color:var(--color-line)] p-3">
          <p className="text-xs text-[color:var(--color-muted)]">
            Send this now — it is shown only once.
          </p>
          <p className="break-all font-mono text-xs text-[color:var(--color-ink)]">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</Button>
            {number && (
              <a
                className="inline-flex items-center rounded bg-teal px-3 py-2 text-sm font-semibold text-white"
                href={whatsappTo(number, reviewMessage(clientName, job.vehicle_label, url))}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send on WhatsApp
              </a>
            )}
          </div>
          {!number && (
            <p className="text-xs text-[color:var(--color-muted)]">
              No phone number on the client — copy the link and send it yourself.
            </p>
          )}
        </div>
      ) : (
        <Button variant="accent" disabled={create.isPending} onClick={makeLink}>
          {state.kind === 'none' ? 'Get review link' : 'New review link'}
        </Button>
      )}
      {create.isError && <p className="text-xs text-signal">{(create.error as Error).message}</p>}

      {(reviews.data ?? []).length > 0 && (
        <ul className="space-y-1 text-sm">
          {reviews.data!.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  t.status === 'approved' ? 'pass' : t.status === 'pending' ? 'attention' : 'muted'
                }
              >
                {t.status}
              </Badge>
              <span className="text-[color:var(--color-ink)]">{t.first_name}</span>
              {t.rating && <span className="text-signal">{'★'.repeat(t.rating)}</span>}
              <span className="truncate text-[color:var(--color-muted)]">“{t.comment}”</span>
            </li>
          ))}
          <li>
            <Link to="/admin/content/testimonials" className="text-xs underline">
              Approve or reject in Testimonials →
            </Link>
          </li>
        </ul>
      )}

      {job.public_consent ? (
        adding ? (
          <OwnerTestimonialForm job={job} clientName={clientName} onDone={() => setAdding(false)} />
        ) : (
          <Button onClick={() => setAdding(true)}>Add testimonial on the client’s behalf</Button>
        )
      ) : (
        <p className="text-xs text-[color:var(--color-muted)]">
          To add a testimonial for the client, they must first agree to the job being shown
          (Check-in tab).
        </p>
      )}
    </Card>
  );
}

function OwnerTestimonialForm({
  job,
  clientName,
  onDone,
}: {
  job: JobWithRefs;
  clientName: string;
  onDone: () => void;
}) {
  const add = useAddOwnerTestimonial(job.id);
  const [firstName, setFirstName] = useState(clientName.trim().split(/\s+/)[0] ?? '');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const ready = firstName.trim() !== '' && comment.trim() !== '';
  return (
    <div className="space-y-3 rounded border border-[color:var(--color-line)] p-3">
      <p className="text-xs text-[color:var(--color-muted)]">
        Shown publicly as “Shared with us by the client”. Approved at once.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Client’s first name">
          <Input
            aria-label="Client’s first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Labeled>
        <Labeled label="Rating">
          <Select aria-label="Rating" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">No rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </Select>
        </Labeled>
      </div>
      <Labeled label="What the client said">
        <Textarea
          aria-label="What the client said"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Labeled>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="accent"
          disabled={!ready || add.isPending}
          onClick={() =>
            add.mutate(
              {
                firstName,
                vehicleLabel: job.vehicle_label,
                rating: rating ? Number(rating) : null,
                comment,
              },
              { onSuccess: onDone },
            )
          }
        >
          Add testimonial
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
      {add.isError && <p className="text-xs text-signal">{(add.error as Error).message}</p>}
    </div>
  );
}
