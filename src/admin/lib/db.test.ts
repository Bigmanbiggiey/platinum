import { describe, it, expect } from 'vitest';
import { STATUSES, prettyType, statusTone } from './db';

describe('request helpers', () => {
  it('prettyType humanises enum values', () => {
    expect(prettyType('pre_purchase_inspection')).toBe('Pre Purchase Inspection');
    expect(prettyType('booking')).toBe('Booking');
  });

  it('statusTone maps to brand roles', () => {
    expect(statusTone('completed')).toBe('pass');
    expect(statusTone('scheduled')).toBe('pass');
    expect(statusTone('new')).toBe('attention');
    expect(statusTone('spam')).toBe('muted');
    expect(statusTone('contacted')).toBe('neutral');
  });

  it('STATUSES covers the pipeline', () => {
    expect(STATUSES).toContain('new');
    expect(STATUSES).toContain('closed');
    expect(STATUSES).toContain('archived');
  });
});
