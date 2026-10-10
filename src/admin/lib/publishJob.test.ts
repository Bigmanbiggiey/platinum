import { describe, it, expect } from 'vitest';
import { defaultSummary, defaultTitle, pickCover, publishBlockers } from './publishJob';

describe('publishBlockers', () => {
  it('needs a completed job with consent', () => {
    expect(publishBlockers({ status: 'completed', public_consent: true })).toEqual([]);
    expect(publishBlockers({ status: 'in_repair', public_consent: true })).toHaveLength(1);
    expect(publishBlockers({ status: 'awaiting_review', public_consent: false })).toHaveLength(2);
  });
});

describe('defaults', () => {
  it('titles with the service when there is one', () => {
    expect(defaultTitle('2014 Toyota Fielder', 'Brake overhaul')).toBe(
      'Brake overhaul — 2014 Toyota Fielder',
    );
    expect(defaultTitle('2014 Toyota Fielder', null)).toBe('2014 Toyota Fielder');
  });
  it('summarises with the first line of the complaint', () => {
    expect(defaultSummary('Squeal when braking\nworse in the rain', 'x')).toBe(
      'Squeal when braking',
    );
    expect(defaultSummary(null, '2014 Toyota Fielder')).toBe('Work on a 2014 Toyota Fielder.');
  });
});

describe('pickCover', () => {
  const p = (
    media_id: string,
    stage: 'check_in' | 'diagnosis' | 'repair',
    is_public = true,
    display_order = 100,
  ) => ({
    media_id,
    stage,
    is_public,
    display_order,
    created_at: '2026-10-01T08:00:00Z',
  });
  it('prefers the first public after photo, else the first public photo', () => {
    expect(
      pickCover([
        p('a', 'check_in'),
        p('h', 'repair', false),
        p('r2', 'repair', true, 2),
        p('r1', 'repair', true, 1),
      ]),
    ).toBe('r1');
    expect(pickCover([p('h', 'repair', false), p('a', 'check_in')])).toBe('a');
    expect(pickCover([p('h', 'repair', false)])).toBeNull();
  });
});
