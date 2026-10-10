import { describe, it, expect } from 'vitest';
import {
  agendaDayLabel,
  formatKes,
  fromDateInput,
  groupAgendaByDay,
  groupJobsByVehicle,
  jobCostSummary,
  jobPrefillFromRequest,
  jobStatusOptions,
  jobStatusTone,
  matchesJobFilter,
  matchesJobSearch,
  partCost,
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
      jobCostSummary(4000, [
        { job_part_cost: { cost_kes: 3500 } },
        { job_part_cost: null },
        { job_part_cost: { cost_kes: null } },
        { job_part_cost: { cost_kes: 800 } },
      ]),
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

describe('partCost', () => {
  it('reads the owner-only cost embed; null when hidden or unset', () => {
    expect(partCost({ job_part_cost: { cost_kes: 800 } })).toBe(800);
    expect(partCost({ job_part_cost: { cost_kes: null } })).toBeNull();
    expect(partCost({ job_part_cost: null })).toBeNull();
  });
});

describe('jobStatusOptions', () => {
  it('lets the owner pick any status', () => {
    expect(jobStatusOptions('in_repair', true)).toEqual([
      'checked_in',
      'diagnosing',
      'in_repair',
      'completed',
      'cancelled',
    ]);
  });
  it('never offers staff "cancelled"', () => {
    expect(jobStatusOptions('in_repair', false)).toEqual([
      'checked_in',
      'diagnosing',
      'in_repair',
      'completed',
    ]);
  });
  it('locks a cancelled job for staff', () => {
    expect(jobStatusOptions('cancelled', false)).toEqual(['cancelled']);
  });
});

describe('groupAgendaByDay', () => {
  it('groups by the Kenyan calendar day, soonest first, skipping unbooked jobs', () => {
    const jobs = [
      { id: 'b', booked_at: '2026-10-02T06:00:00+00:00' },
      { id: 'a', booked_at: '2026-09-30T22:30:00+00:00' }, // 01:30 on 1 Oct in Nairobi
      { id: 'c', booked_at: '2026-10-01T09:00:00+00:00' },
      { id: 'x', booked_at: null },
    ];
    expect(groupAgendaByDay(jobs)).toEqual([
      { day: '2026-10-01', jobs: [jobs[1], jobs[2]] },
      { day: '2026-10-02', jobs: [jobs[0]] },
    ]);
  });
});

describe('agendaDayLabel', () => {
  it('names the day', () => {
    expect(agendaDayLabel('2026-10-01')).toMatch(/1/);
    expect(agendaDayLabel('2026-10-01')).toMatch(/Oct/);
  });
});
