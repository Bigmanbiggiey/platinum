import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { CallWhatsApp } from '../components/ui/CallWhatsApp';
import { Field, Honeypot, Select, TextArea, TextInput } from '../components/ui/Field';
import { Turnstile } from './Turnstile';
import { useSubmit } from './useSubmit';
import { trackCta } from '../../shared/analytics';
import type { RequestType } from '../../shared/supabase/types';

export type EnquiryVariant = 'booking' | 'service' | 'inspection' | 'contact';

const SERVICE_OPTIONS: { value: RequestType; label: string }[] = [
  { value: 'general_repair', label: 'General repair' },
  { value: 'diagnostics', label: 'Diagnostics' },
  { value: 'maintenance', label: 'Preventive maintenance' },
  { value: 'assessment', label: 'Vehicle assessment' },
  { value: 'road_test', label: 'Road test' },
  { value: 'engineering', label: 'Engineering / press & lathe' },
  { value: 'other', label: 'Something else' },
];

const CTA_EVENT = {
  booking: 'form_submit_booking',
  service: 'form_submit_service',
  inspection: 'form_submit_inspection',
  contact: 'form_submit_contact',
} as const;

interface Props {
  variant: EnquiryVariant;
  /** Time-window choices for the booking variant. */
  timeWindows?: string[];
  /** Shown on the success panel (e.g. the booking.expectation copy). */
  confirmationNote?: string;
}

export function EnquiryForm({ variant, timeWindows = [], confirmationNote }: Props) {
  const { status, error, submit } = useSubmit();
  const startedAt = useRef(Date.now());
  const [hp, setHp] = useState('');
  const [token, setToken] = useState<string | undefined>();
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const needsArea = variant !== 'contact';
  const needsWindow = variant === 'booking';

  const validate = () => {
    const err: Record<string, string> = {};
    if (!values.contact_name?.trim()) err.contact_name = 'Please tell us your name.';
    if (!values.contact_phone?.trim()) err.contact_phone = 'A phone / WhatsApp number is required.';
    if (values.contact_email && !values.contact_email.includes('@'))
      err.contact_email = 'That email looks off.';
    if (needsArea && !values.area?.trim())
      err.area = variant === 'inspection' ? 'Where is the vehicle?' : 'Which area are you in?';
    if (variant === 'booking' && !values.requested_date)
      err.requested_date = 'Pick a preferred date.';
    if (needsWindow && !values.requested_time_window)
      err.requested_time_window = 'Pick a time window.';
    if (variant === 'contact' && !values.message?.trim()) err.message = 'What can we help with?';
    if (!consent) err.consent = 'Please tick to consent.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const request_type: RequestType =
      variant === 'booking'
        ? 'booking'
        : variant === 'inspection'
          ? 'pre_purchase_inspection'
          : variant === 'contact'
            ? 'general_contact'
            : (values.request_type as RequestType) || 'general_repair';

    const messageParts = [values.message];
    if (variant === 'booking' && values.service) messageParts.unshift(`Service: ${values.service}`);

    const ok = await submit(
      'service_request',
      {
        request_type,
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
        contact_whatsapp: values.contact_whatsapp || undefined,
        contact_email: values.contact_email || undefined,
        vehicle_description: values.vehicle_description || undefined,
        area: values.area || undefined,
        requested_date: values.requested_date || undefined,
        requested_time_window: values.requested_time_window || undefined,
        message: messageParts.filter(Boolean).join('\n') || undefined,
        consent: true,
        source: `web:${variant}`,
      },
      { hp, startedAt: startedAt.current, turnstileToken: token },
    );
    if (ok) trackCta(CTA_EVENT[variant]);
  };

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (status === 'ok') {
    return (
      <div className="rounded-lg border border-teal/40 bg-teal/10 p-5">
        <p className="font-semibold text-[color:var(--color-ink)]">
          Thank you — we&rsquo;ve got that.
        </p>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">
          {confirmationNote ??
            'We&rsquo;ll get back to you by call or WhatsApp, usually within a few hours.'}
        </p>
        <div className="mt-4">
          <CallWhatsApp context={`confirm-${variant}`} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Honeypot value={hp} onChange={setHp} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="contact_name" required error={errors.contact_name}>
          <TextInput id="contact_name" autoComplete="name" onChange={set('contact_name')} />
        </Field>
        <Field
          label="Phone / WhatsApp"
          htmlFor="contact_phone"
          required
          error={errors.contact_phone}
        >
          <TextInput
            id="contact_phone"
            inputMode="tel"
            autoComplete="tel"
            onChange={set('contact_phone')}
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="contact_email" hint="Optional" error={errors.contact_email}>
        <TextInput
          id="contact_email"
          type="email"
          autoComplete="email"
          onChange={set('contact_email')}
        />
      </Field>

      {variant === 'service' && (
        <Field label="What do you need?" htmlFor="request_type" required>
          <Select id="request_type" defaultValue="general_repair" onChange={set('request_type')}>
            {SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {variant === 'booking' && (
        <>
          <Field label="Service needed" htmlFor="service" hint="Optional">
            <TextInput
              id="service"
              onChange={set('service')}
              placeholder="e.g. brake service, diagnostics"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Preferred date"
              htmlFor="requested_date"
              required
              error={errors.requested_date}
            >
              <TextInput
                id="requested_date"
                type="date"
                min={today}
                onChange={set('requested_date')}
              />
            </Field>
            <Field
              label="Time window"
              htmlFor="requested_time_window"
              required
              error={errors.requested_time_window}
            >
              <Select
                id="requested_time_window"
                defaultValue=""
                onChange={set('requested_time_window')}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {(timeWindows.length ? timeWindows : ['Morning', 'Midday', 'Afternoon']).map(
                  (w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>
        </>
      )}

      {variant !== 'contact' && (
        <Field
          label={variant === 'inspection' ? 'Where is the vehicle?' : 'Your area'}
          htmlFor="area"
          required
          error={errors.area}
        >
          <TextInput id="area" onChange={set('area')} placeholder="e.g. Kitengela, Milimani" />
        </Field>
      )}

      {variant !== 'contact' && (
        <Field label="Vehicle" htmlFor="vehicle_description" hint="Make, model, year — optional">
          <TextInput id="vehicle_description" onChange={set('vehicle_description')} />
        </Field>
      )}

      <Field
        label={
          variant === 'contact'
            ? 'Message'
            : variant === 'inspection'
              ? 'Anything you’re worried about?'
              : 'Describe the problem'
        }
        htmlFor="message"
        required={variant === 'contact'}
        hint={variant === 'contact' ? undefined : 'Optional'}
        error={errors.message}
      >
        <TextArea id="message" onChange={set('message')} />
      </Field>

      <label className="flex items-start gap-2 text-sm text-[color:var(--color-muted)]">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree that Platinum Point may use these details to respond to my enquiry.{' '}
          {errors.consent && <span className="text-signal">— {errors.consent}</span>}
        </span>
      </label>

      <Turnstile onToken={setToken} />

      {error && <p className="text-sm text-signal">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="accent" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send'}
        </Button>
        <span className="text-sm text-[color:var(--color-muted)]">or just call / WhatsApp us.</span>
      </div>
    </form>
  );
}
