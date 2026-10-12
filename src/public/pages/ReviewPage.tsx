import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Button, ButtonAnchor } from '../components/ui/Button';
import { Field, Honeypot, TextArea, TextInput } from '../components/ui/Field';
import { Turnstile } from '../forms/Turnstile';
import { useSubmit } from '../forms/useSubmit';
import { getSupabaseClient } from '../../shared/supabase/client';
import { BUSINESS } from '../../shared/business';

interface Summary {
  vehicle_label: string;
  service_title: string | null;
  completed_at: string | null;
}

type Lookup = { state: 'loading' } | { state: 'invalid' } | { state: 'ok'; summary: Summary };

/** The code from /review/<code> (the rewrite serves this one prerendered shell). */
export function reviewCode(pathname: string): string | null {
  const m = /^\/review\/([A-Za-z0-9_-]{43})\/?$/.exec(pathname);
  return m ? m[1] : null;
}

const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Nairobi',
      })
    : null;

/**
 * A client's one-time review link (jobs spec §6.3). Prerendered once as /review; the code
 * is read in the browser, so the build never sees it. Shows only the vehicle, service
 * and date — never client details. Unknown, expired and used links read the same.
 */
export function ReviewPage() {
  const [code, setCode] = useState<string | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ state: 'loading' });

  useEffect(() => {
    const c = reviewCode(window.location.pathname);
    setCode(c);
    const db = getSupabaseClient();
    if (!c || !db) {
      setLookup({ state: 'invalid' });
      return;
    }
    let live = true;
    void (async () => {
      const { data, error } = await db.rpc('review_invite_summary', { token: c });
      if (!live) return;
      const row = !error && Array.isArray(data) ? (data[0] as Summary | undefined) : undefined;
      setLookup(row ? { state: 'ok', summary: row } : { state: 'invalid' });
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <SeoHead
        title="Leave a review — Platinum Point Automotive Engineering"
        description="Tell us how we did."
        path="/review"
        noindex
      />
      <Section title="How did we do?" narrow>
        {lookup.state === 'loading' && (
          <p className="text-[color:var(--color-muted)]" role="status">
            Loading…
          </p>
        )}
        {lookup.state === 'invalid' && <InvalidLink />}
        {lookup.state === 'ok' && code && <ReviewForm code={code} summary={lookup.summary} />}
      </Section>
    </>
  );
}

function InvalidLink() {
  return (
    <div className="space-y-4">
      <p className="text-[color:var(--color-ink)]">
        This link is no longer valid — please contact us.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonAnchor href={BUSINESS.whatsappUrl} variant="accent">
          WhatsApp us
        </ButtonAnchor>
        <ButtonAnchor href={`tel:${BUSINESS.phoneE164}`} variant="outline">
          Call {BUSINESS.phoneDisplay}
        </ButtonAnchor>
      </div>
    </div>
  );
}

function ReviewForm({ code, summary }: { code: string; summary: Summary }) {
  const { status, error, submit } = useSubmit();
  const startedAt = useRef(Date.now());
  const [hp, setHp] = useState('');
  const [token, setToken] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const what = [
    summary.service_title,
    day(summary.completed_at) && `completed ${day(summary.completed_at)}`,
  ]
    .filter(Boolean)
    .join(', ');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!firstName.trim()) err.first_name = 'First name, please.';
    if (!rating) err.rating = 'Pick a rating.';
    if (!comment.trim()) err.comment = 'Add a short comment.';
    if (!consent) err.consent = 'Please tick to allow us to publish this.';
    setErrors(err);
    if (Object.keys(err).length) return;
    await submit(
      'review',
      { token: code, first_name: firstName, rating, comment, consent: true },
      { hp, startedAt: startedAt.current, turnstileToken: token },
    );
  };

  if (status === 'ok') {
    return (
      <div className="rounded-structural border border-[color:var(--color-confirm)]/40 bg-[color:var(--color-confirm)]/10 p-5 text-sm">
        <p className="font-semibold text-[color:var(--color-ink)]">Thank you!</p>
        <p className="mt-2 text-[color:var(--color-muted)]">
          Your review has been sent. Once approved it will appear on our website as your first name
          and vehicle.
        </p>
      </div>
    );
  }
  if (status === 'invalid-link') return <InvalidLink />;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-lg text-[color:var(--color-ink)]">
        How did we do on your <span className="font-semibold">{summary.vehicle_label}</span>
        {what ? ` (${what})` : ''}?
      </p>
      <Honeypot value={hp} onChange={setHp} />
      <Field label="First name" htmlFor="first_name" required error={errors.first_name}>
        <TextInput
          id="first_name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </Field>
      <fieldset>
        <legend className="text-sm font-semibold text-[color:var(--color-ink)]">
          Rating <span className="text-signal">*</span>
        </legend>
        <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              onClick={() => setRating(n)}
              className={`text-3xl leading-none ${n <= rating ? 'text-signal' : 'text-[color:var(--color-line)]'}`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-1 text-sm text-signal">{errors.rating}</p>}
      </fieldset>
      <Field label="Your comment" htmlFor="comment" required error={errors.comment}>
        <TextArea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      <label className="flex items-start gap-2 text-sm text-[color:var(--color-muted)]">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree Platinum Point may publish my first name, vehicle and comment.{' '}
          {errors.consent && <span className="text-signal">— {errors.consent}</span>}
        </span>
      </label>
      <Turnstile onToken={setToken} />
      {error && <p className="text-sm text-signal">{error}</p>}
      <Button type="submit" variant="accent" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Send review'}
      </Button>
    </form>
  );
}
