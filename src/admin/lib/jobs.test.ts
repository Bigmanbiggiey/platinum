import { describe, it, expect } from 'vitest';
import {
  formatKes,
  fromDateInput,
  groupJobsByVehicle,
  jobCostSummary,
  jobPrefillFromRequest,
  jobStatusTone,
  matchesJobFilter,
  matchesJobSearch,
  pendingFindingsCount,
  photoAlt,
  toDateInput,
  vehicleLabel,
} from './jobs';

describe('vehicleLabel', () => {
  it('joins year, make and model', () => {
    expect(vehicleLabel({ year: 2014, make: 'Toyota', model: 'Fielder' })).toBe(
      '2014 Toyota Fielder',
    );
  });
  it('skips missing parts', () => {
    expect(vehicleLabel({ make: 'Isuzu D-Max', model: null, year: null })).toBe('Isuzu D-Max');
    expect(vehicleLabel({ make: 'Mazda', model: ' ' })).toBe('Mazda');
  });
});

describe('jobStatusTone', () => {
  it('maps statuses to brand roles', () => {
    expect(jobStatusTone('checked_in')).toBe('attention');
    expect(jobStatusTone('diagnosing')).toBe('neutral');
    expect(jobStatusTone('in_repair')).toBe('neutral');
    expect(jobStatusTone('completed')).toBe('pass');
    expect(jobStatusTone('cancelled')).toBe('muted');
  });
});

describe('matchesJobFilter', () => {
  it('open covers checked_in, diagnosing and in_repair only', () => {
    expect(matchesJobFilter({ status: 'checked_in' }, 'open')).toBe(true);
    expect(matchesJobFilter({ status: 'in_repair' }, 'open')).toBe(true);
    expect(matchesJobFilter({ status: 'completed' }, 'open')).toBe(false);
    expect(matchesJobFilter({ status: 'cancelled' }, 'open')).toBe(false);
  });
  it('completed / cancelled match exactly; all matches everything', () => {
    expect(matchesJobFilter({ status: 'completed' }, 'completed')).toBe(true);
    expect(matchesJobFilter({ status: 'in_repair' }, 'completed')).toBe(false);
    expect(matchesJobFilter({ status: 'cancelled' }, 'all')).toBe(true);
  });
});

describe('matchesJobSearch', () => {
  const job = {
    job_number: 'PP-2026-0042',
    vehicle_label: '2014 Toyota Fielder',
    client: { name: 'Jane Wanjiru' },
    vehicle: { registration: 'KDA 123A' },
  };
  it('matches job number, client, vehicle and registration, ignoring case and spaces', () => {
    expect(matchesJobSearch(job, '0042')).toBe(true);
    expect(matchesJobSearch(job, 'wanjiru')).toBe(true);
    expect(matchesJobSearch(job, 'fielder')).toBe(true);
    expect(matchesJobSearch(job, 'kda123a')).toBe(true);
    expect(matchesJobSearch(job, 'KDA 123')).toBe(true);
  });
  it('empty term matches; unrelated term does not', () => {
    expect(matchesJobSearch(job, '  ')).toBe(true);
    expect(matchesJobSearch(job, 'subaru')).toBe(false);
  });
  it('copes with a removed client or vehicle', () => {
    expect(matchesJobSearch({ ...job, client: null, vehicle: null }, 'fielder')).toBe(true);
  });
});

describe('photoAlt', () => {
  it('describes vehicle, stage and finding', () => {
    expect(photoAlt('2014 Toyota Fielder', 'diagnosis', 'Worn front brake pads')).toBe(
      '2014 Toyota Fielder — Before repair — Worn front brake pads',
    );
    expect(photoAlt('2014 Toyota Fielder', 'check_in')).toBe('2014 Toyota Fielder — Check-in');
    expect(photoAlt('Mazda Demio', 'repair', null)).toBe('Mazda Demio — After repair');
  });
});

describe('costs', () => {
  it('sums labour and line costs, treating blanks as zero', () => {
    expect(
      jobCostSummary(4000, [{ cost_kes: 3500 }, { cost_kes: null }, { cost_kes: 800 }]),
    ).toEqual({
      labour: 4000,
      parts: 4300,
      total: 8300,
    });
    expect(jobCostSummary(null, [])).toEqual({ labour: 0, parts: 0, total: 0 });
  });
  it('formats Kenyan shillings', () => {
    expect(formatKes(800)).toBe('KES 800');
    expect(formatKes(12500)).toBe('KES 12,500');
  });
  it('counts findings still pending', () => {
    expect(
      pendingFindingsCount([{ outcome: 'pending' }, { outcome: 'fixed' }, { outcome: 'pending' }]),
    ).toBe(2);
  });
});

describe('date inputs (Kenyan time)', () => {
  it('toDateInput renders the Nairobi calendar date', () => {
    expect(toDateInput('2026-09-11T22:30:00Z')).toBe('2026-09-12'); // 01:30 in Nairobi
    expect(toDateInput(null)).toBe('');
  });
  it('fromDateInput gives the start of that day in Nairobi', () => {
    expect(fromDateInput('2026-09-12')).toBe('2026-09-12T00:00:00+03:00');
    expect(fromDateInput('')).toBeNull();
  });
});

describe('jobPrefillFromRequest', () => {
  it('copies links, booked date and complaint', () => {
    expect(
      jobPrefillFromRequest({
        id: 'r1',
        client_id: 'c1',
        vehicle_id: 'v1',
        requested_date: '2026-09-14',
        message: '  Grinding noise when braking  ',
      }),
    ).toEqual({
      service_request_id: 'r1',
      client_id: 'c1',
      vehicle_id: 'v1',
      booked_at: '2026-09-14T00:00:00+03:00',
      complaint: 'Grinding noise when braking',
    });
  });
  it('leaves booked_at and complaint empty when the request has none', () => {
    const p = jobPrefillFromRequest({
      id: 'r2',
      client_id: 'c1',
      vehicle_id: null,
      requested_date: null,
      message: '   ',
    });
    expect(p.booked_at).toBeNull();
    expect(p.complaint).toBeNull();
  });
});

describe('groupJobsByVehicle', () => {
  it('groups in first-seen order and labels removed vehicles', () => {
    const groups = groupJobsByVehicle([
      { id: 'a', vehicle_id: 'v1', vehicle_label: '2014 Toyota Fielder' },
      { id: 'b', vehicle_id: 'v2', vehicle_label: 'Mazda Demio' },
      { id: 'c', vehicle_id: 'v1', vehicle_label: '2014 Toyota Fielder' },
      { id: 'd', vehicle_id: null, vehicle_label: 'Old Subaru' },
    ]);
    expect(groups.map((g) => [g.label, g.jobs.map((j) => j.id)])).toEqual([
      ['2014 Toyota Fielder', ['a', 'c']],
      ['Mazda Demio', ['b']],
      ['Vehicle removed', ['d']],
    ]);
  });
});
