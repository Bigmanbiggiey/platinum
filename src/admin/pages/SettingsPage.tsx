import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Labeled,
  Input,
  PageTitle,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { useSettings, useUpdateSettings } from '../lib/settings';
import { usePublish } from '../lib/rebuild';

type HoursRow = { days: string; open: string; close: string; label: string };

export function SettingsPage() {
  const q = useSettings();
  const save = useUpdateSettings();
  const publish = usePublish();
  const s = q.data;

  const [form, setForm] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!s) return;
    setForm({
      business_name: s.business_name ?? '',
      legal_name: s.legal_name ?? '',
      tagline: s.tagline ?? '',
      phone: s.phone ?? '',
      whatsapp: s.whatsapp ?? '',
      email: s.email ?? '',
      base_area: s.base_area ?? '',
      gbp_url: s.gbp_url ?? '',
      seo_description: s.default_seo?.description ?? '',
      notification_channel: s.notification_channel ?? 'email',
      notification_email: s.notification_email ?? '',
      social_links: JSON.stringify(s.social_links ?? {}, null, 2),
    });
    setHours(s.hours ?? []);
  }, [s]);

  if (q.isLoading) return <Spinner />;
  if (!s) return <p className="text-sm text-signal">Settings row not found.</p>;

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async () => {
    let social: Record<string, string> = {};
    try {
      social = JSON.parse(form.social_links || '{}');
    } catch {
      alert('Social links must be valid JSON.');
      return;
    }
    await save.mutateAsync({
      business_name: form.business_name,
      legal_name: form.legal_name || null,
      tagline: form.tagline || null,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      base_area: form.base_area,
      gbp_url: form.gbp_url || null,
      hours,
      social_links: social,
      default_seo: { ...s.default_seo, description: form.seo_description },
      notification_channel: form.notification_channel,
      notification_email: form.notification_email || null,
    });
    setSaved(true);
    publish.trigger();
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section className="space-y-6">
      <PageTitle
        actions={
          <Button variant="accent" onClick={onSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        }
      >
        Business settings
      </PageTitle>
      {saved && <p className="text-sm text-teal">Saved. {publish.message}</p>}

      <Card className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Business name">
          <Input value={form.business_name} onChange={set('business_name')} />
        </Labeled>
        <Labeled label="Registered legal name (optional)">
          <Input value={form.legal_name} onChange={set('legal_name')} />
        </Labeled>
        <Labeled label="Tagline">
          <Input value={form.tagline} onChange={set('tagline')} />
        </Labeled>
        <Labeled label="Base area">
          <Input value={form.base_area} onChange={set('base_area')} />
        </Labeled>
        <Labeled label="Phone">
          <Input value={form.phone} onChange={set('phone')} />
        </Labeled>
        <Labeled label="WhatsApp (digits only, e.g. 2547…)">
          <Input value={form.whatsapp} onChange={set('whatsapp')} />
        </Labeled>
        <Labeled label="Public email">
          <Input value={form.email} onChange={set('email')} />
        </Labeled>
        <Labeled label="Google Business Profile URL">
          <Input value={form.gbp_url} onChange={set('gbp_url')} />
        </Labeled>
      </Card>

      <Card>
        <Labeled label="Default meta description (SEO)">
          <Textarea value={form.seo_description} onChange={set('seo_description')} rows={2} />
        </Labeled>
      </Card>

      <Card>
        <p className="mb-3 font-semibold text-[color:var(--color-ink)]">Opening hours</p>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4">
              <Input
                value={h.days}
                onChange={(e) =>
                  setHours((hs) => hs.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)))
                }
                placeholder="Mon – Sat"
              />
              <Input
                value={h.open}
                onChange={(e) =>
                  setHours((hs) => hs.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))
                }
                placeholder="09:00"
              />
              <Input
                value={h.close}
                onChange={(e) =>
                  setHours((hs) =>
                    hs.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)),
                  )
                }
                placeholder="19:30"
              />
              <Input
                value={h.label}
                onChange={(e) =>
                  setHours((hs) =>
                    hs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  )
                }
                placeholder="9:00 AM – 7:30 PM"
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            onClick={() => setHours((hs) => [...hs, { days: '', open: '', close: '', label: '' }])}
          >
            Add row
          </Button>
          {hours.length > 0 && (
            <Button variant="danger" onClick={() => setHours((hs) => hs.slice(0, -1))}>
              Remove last
            </Button>
          )}
        </div>
      </Card>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Enquiry notification channel">
          <Select value={form.notification_channel} onChange={set('notification_channel')}>
            <option value="email">Email</option>
            <option value="dashboard">Dashboard only</option>
          </Select>
        </Labeled>
        <Labeled label="Notification email">
          <Input value={form.notification_email} onChange={set('notification_email')} />
        </Labeled>
      </Card>

      <Card>
        <Labeled label='Social links (JSON: {"facebook":"https://…"})'>
          <Textarea
            value={form.social_links}
            onChange={set('social_links')}
            rows={4}
            className="font-mono text-xs"
          />
        </Labeled>
      </Card>
    </section>
  );
}
