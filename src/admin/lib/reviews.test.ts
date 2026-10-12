import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ getDb: vi.fn() }));
vi.mock('./publishJob', () => ({ isOnWebsite: vi.fn() }));
vi.mock('./rebuild', () => ({ rebuildNow: vi.fn() }));

import {
  inviteState,
  publicReview,
  reviewMessage,
  reviewUrl,
  waNumber,
  whatsappTo,
} from './reviews';
import type { AdminTestimonial } from './resources';

const now = new Date('2026-10-12T10:00:00Z');

describe('inviteState', () => {
  const base = { id: 'i1', created_at: '2026-10-01T10:00:00Z', used_at: null };
  it('no link', () => expect(inviteState(null, now)).toEqual({ kind: 'none' }));
  it('live link', () =>
    expect(inviteState({ ...base, expires_at: '2026-10-31T10:00:00Z' }, now)).toEqual({
      kind: 'sent',
      sentAt: base.created_at,
      expiresAt: '2026-10-31T10:00:00Z',
    }));
  it('expired or replaced', () =>
    expect(inviteState({ ...base, expires_at: '2026-10-05T10:00:00Z' }, now).kind).toBe('expired'));
  it('used wins over expiry', () =>
    expect(
      inviteState(
        { ...base, expires_at: '2026-10-05T10:00:00Z', used_at: '2026-10-03T10:00:00Z' },
        now,
      ),
    ).toEqual({ kind: 'used', usedAt: '2026-10-03T10:00:00Z' }));
});

describe('waNumber', () => {
  it.each([
    ['0722 322 870', '254722322870'],
    ['0110-123456', '254110123456'],
    ['722322870', '254722322870'],
    ['+254 722 322870', '254722322870'],
    ['+44 7700 900123', '447700900123'],
  ])('%s → %s', (raw, out) => expect(waNumber(raw)).toBe(out));
  it.each([null, '', '12345', 'call me'])('%s → null', (raw) => expect(waNumber(raw)).toBeNull());
});

describe('review link + message', () => {
  it('builds the review URL', () => {
    expect(reviewUrl('https://site.test/', 'abc')).toBe('https://site.test/review/abc');
  });
  it('greets by first name and names the vehicle', () => {
    const m = reviewMessage('Amina Wanjiku', '2014 Toyota Fielder', 'https://x/review/c');
    expect(m).toMatch(/^Hi Amina,/);
    expect(m).toContain('2014 Toyota Fielder');
    expect(m).toContain('https://x/review/c');
  });
  it('opens a chat with the client', () => {
    expect(whatsappTo('254722322870', 'Hi & bye')).toBe(
      'https://wa.me/254722322870?text=Hi%20%26%20bye',
    );
  });
});

describe('publicReview', () => {
  const row = (over: Partial<AdminTestimonial>): AdminTestimonial => ({
    id: 't',
    first_name: 'Amina',
    vehicle_label: '2014 Toyota Fielder',
    rating: 5,
    comment: 'Great',
    consent: true,
    source: 'review_link',
    status: 'approved',
    is_featured: false,
    submitted_at: '2026-10-01T00:00:00Z',
    job_id: 'j1',
    ...over,
  });
  it('picks the latest approved, consented review — public fields only', () => {
    expect(
      publicReview([
        row({ id: 'a', comment: 'old' }),
        row({ id: 'b', comment: 'new', submitted_at: '2026-10-05T00:00:00Z' }),
        row({
          id: 'c',
          comment: 'pending',
          status: 'pending',
          submitted_at: '2026-10-09T00:00:00Z',
        }),
        row({
          id: 'd',
          comment: 'no consent',
          consent: false,
          submitted_at: '2026-10-09T00:00:00Z',
        }),
      ]),
    ).toEqual({
      first_name: 'Amina',
      vehicle_label: '2014 Toyota Fielder',
      rating: 5,
      comment: 'new',
      source: 'review_link',
    });
  });
  it('none approved → null', () => {
    expect(publicReview([row({ status: 'rejected' })])).toBeNull();
  });
});
