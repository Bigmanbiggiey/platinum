import { describe, expect, it } from 'vitest';
import { isStep, nextStep, prevStep, repairComplete, statusOnEnter } from './jobFlow';

describe('job step flow', () => {
  it('walks the steps in order, with Activity outside them', () => {
    expect(nextStep('check-in')?.key).toBe('diagnosis');
    expect(nextStep('repair')?.key).toBe('wrap-up');
    expect(nextStep('wrap-up')).toBeUndefined();
    expect(prevStep('diagnosis')?.key).toBe('check-in');
    expect(prevStep('check-in')).toBeUndefined();
    expect(isStep('activity')).toBe(false);
  });

  it('moves the status forward only', () => {
    expect(statusOnEnter('diagnosis', 'checked_in')).toBe('diagnosing');
    expect(statusOnEnter('repair', 'checked_in')).toBe('in_repair');
    expect(statusOnEnter('repair', 'diagnosing')).toBe('in_repair');
    expect(statusOnEnter('diagnosis', 'in_repair')).toBeNull();
    expect(statusOnEnter('repair', 'in_repair')).toBeNull();
    expect(statusOnEnter('wrap-up', 'in_repair')).toBeNull();
  });

  it('never touches a job that is past the working stages', () => {
    for (const s of ['awaiting_review', 'completed', 'cancelled'] as const) {
      expect(statusOnEnter('repair', s)).toBeNull();
    }
  });

  it('counts repair done once no problem is pending', () => {
    expect(repairComplete([])).toBe(false);
    expect(repairComplete([{ outcome: 'fixed' }, { outcome: 'pending' }])).toBe(false);
    expect(repairComplete([{ outcome: 'fixed' }, { outcome: 'deferred' }])).toBe(true);
  });
});
