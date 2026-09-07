import { useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, Honeypot, Select, TextArea, TextInput } from '../components/ui/Field';
import { Turnstile } from './Turnstile';
import { useSubmit } from './useSubmit';
import { trackCta } from '../../shared/analytics';

/** Public testimonial submission — moderated; displayed as first name + vehicle only. */
export function TestimonialForm() {
  const { status, error, submit } = useSubmit();
  const startedAt = useRef(Date.now());
  const [hp, setHp] = useState('');
  const [token, setToken] = useState<string | undefined>();
  const [v, setV] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!v.first_name?.trim()) err.first_name = 'First name, please.';
    if (!v.vehicle_label?.trim()) err.vehicle_label = 'Which vehicle?';
    if (!v.comment?.trim()) err.comment = 'Add a short comment.';
    if (!consent) err.consent = 'Please tick to allow us to publish this.';
    setErrors(err);
    if (Object.keys(err).length) return;

    const ok = await submit(
      'testimonial',
      {
        first_name: v.first_name,
        vehicle_label: v.vehicle_label,
        rating: v.rating ? Number(v.rating) : undefined,
        comment: v.comment,
        consent: true,
      },
      { hp, startedAt: startedAt.current, turnstileToken: token },
    );
    if (ok) trackCta('form_submit_testimonial');
  };

  if (status === 'ok') {
    return (
      <div className="rounded-lg border border-teal/40 bg-teal/10 p-5 text-sm">
        <p className="font-semibold text-[color:var(--color-ink)]">Thank you!</p>
        <p className="mt-2 text-[color:var(--color-muted)]">
          Your testimonial has been sent for review. Once approved it will appear here as your first
          name and vehicle.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Honeypot value={hp} onChange={setHp} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" required error={errors.first_name}>
          <TextInput id="first_name" onChange={set('first_name')} />
        </Field>
        <Field
          label="Vehicle"
          htmlFor="vehicle_label"
          required
          hint="e.g. Mercedes-Benz G-Wagon"
          error={errors.vehicle_label}
        >
          <TextInput id="vehicle_label" onChange={set('vehicle_label')} />
        </Field>
      </div>
      <Field label="Rating" htmlFor="rating" hint="Optional">
        <Select id="rating" defaultValue="" onChange={set('rating')}>
          <option value="">No rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {'★'.repeat(n)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Your comment" htmlFor="comment" required error={errors.comment}>
        <TextArea id="comment" onChange={set('comment')} />
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
        {status === 'submitting' ? 'Sending…' : 'Submit testimonial'}
      </Button>
    </form>
  );
}
