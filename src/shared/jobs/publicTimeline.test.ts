import { describe, it, expect } from 'vitest';
import { jobSlug, toPublicTimeline } from './publicTimeline';

const job = {
  id: 'j1',
  job_number: 'PP-2026-0042',
  vehicle_label: '2014 Toyota Fielder',
  service_id: 's1',
  booked_at: null,
  checked_in_at: '2026-10-01T08:00:00Z',
  completed_at: '2026-10-02T15:00:00Z',
  complaint: 'Squeal when braking',
};
const t = (n: number) => `2026-10-01T0${n}:00:00Z`;
const photo = (
  id: string,
  finding_id: string | null,
  stage: 'check_in' | 'diagnosis' | 'repair',
  is_public = true,
  display_order = 100,
) => ({
  media_id: id,
  finding_id,
  stage,
  caption: null,
  is_public,
  display_order,
  created_at: t(1),
  media: { storage_path: `p/${id}.jpg`, alt_text: id },
});

describe('toPublicTimeline', () => {
  const findings = [
    {
      id: 'f2',
      title: 'Tired shocks',
      diagnosis: null,
      fix: null,
      outcome: 'deferred' as const,
      display_order: 2,
      created_at: t(2),
    },
    {
      id: 'f1',
      title: 'Worn pads',
      diagnosis: 'Pads at 1 mm',
      fix: 'Replaced front pads',
      outcome: 'fixed' as const,
      display_order: 1,
      created_at: t(1),
    },
  ];
  const parts = [
    {
      finding_id: 'f1',
      name: 'Brake pads',
      created_at: t(1),
      quantity: 2,
      job_part_cost: { cost_kes: 3500 },
    },
  ];
  const photos = [
    photo('after2', 'f1', 'repair', true, 2),
    photo('after1', 'f1', 'repair', true, 1),
    photo('hidden', 'f1', 'repair', false),
    photo('before', 'f1', 'diagnosis'),
    photo('arrival', null, 'check_in'),
  ];
  const tl = toPublicTimeline(job, findings, parts, photos, { serviceTitle: 'Brakes' });

  it('orders problems and splits before/after photos, public ones only', () => {
    expect(tl.findings.map((f) => f.title)).toEqual(['Worn pads', 'Tired shocks']);
    expect(tl.findings[0].before.map((p) => p.id)).toEqual(['before']);
    expect(tl.findings[0].after.map((p) => p.id)).toEqual(['after1', 'after2']);
    expect(tl.general_photos.map((p) => p.id)).toEqual(['arrival']);
  });

  it('never carries anything private', () => {
    const text = JSON.stringify(tl);
    expect(text).not.toContain('hidden');
    expect(text).not.toContain('3500');
    expect(text).not.toContain('quantity');
    expect(tl.findings[0].parts).toEqual(['Brake pads']);
  });
});

describe('jobSlug', () => {
  it('vehicle, service, job-number digits', () => {
    expect(
      jobSlug({
        vehicle_label: '2014 Toyota Fielder',
        service_title: 'Brake overhaul',
        job_number: 'PP-2026-0042',
      }),
    ).toBe('2014-toyota-fielder-brake-overhaul-0042');
  });
  it('copes with no service and punctuation', () => {
    expect(
      jobSlug({ vehicle_label: 'Mercedes-Benz C200 (W204)', job_number: 'PP-2026-0107' }),
    ).toBe('mercedes-benz-c200-w204-0107');
    expect(
      jobSlug({
        vehicle_label: 'Škoda Octavia',
        service_title: 'Engineering — Press & Lathe',
        job_number: 'PP-2026-0005',
      }),
    ).toBe('skoda-octavia-engineering-press-and-lathe-0005');
  });
});
