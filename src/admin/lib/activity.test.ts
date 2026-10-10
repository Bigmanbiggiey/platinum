import { describe, it, expect } from 'vitest';
import { actorLabel, describeActivity, timeAgo, type JobActivity } from './activity';

const d = (action: JobActivity['action'], detail: Record<string, unknown> = {}) =>
  describeActivity({ action, detail });

describe('describeActivity', () => {
  it('describes every action', () => {
    expect(d('checked_in', { job_number: 'PP-2026-0042' })).toBe('checked in the vehicle');
    expect(d('status_changed', { from: 'checked_in', to: 'diagnosing' })).toBe(
      'moved the job from Checked in to Diagnosing',
    );
    expect(d('status_changed', { to: 'completed' })).toBe('moved the job to Completed');
    expect(d('finding_added', { title: 'Worn pads' })).toBe('added problem “Worn pads”');
    expect(d('finding_updated', { title: 'Worn pads', outcome: 'fixed' })).toBe(
      'updated problem “Worn pads” — fixed',
    );
    expect(d('finding_updated', { title: 'Worn pads', outcome: 'pending' })).toBe(
      'updated problem “Worn pads”',
    );
    expect(d('photo_added', { stage: 'repair', count: 2 })).toBe('added 2 after photos');
    expect(d('photo_added', { stage: 'check_in', count: 1 })).toBe('added 1 check-in photo');
    expect(d('photo_added', { stage: 'diagnosis' })).toBe('added 1 before photo');
    expect(d('photo_removed', { stage: 'repair' })).toBe('removed an after photo');
    expect(d('photo_removed', { stage: 'diagnosis' })).toBe('removed a before photo');
    expect(d('part_added', { name: 'Brake pads', quantity: 2 })).toBe('added part Brake pads ×2');
    expect(d('part_removed', { name: 'Brake pads' })).toBe('removed part Brake pads');
    expect(d('labour_updated', { from: null, to: 1.5 })).toBe('set labour to 1.5 h');
    expect(d('labour_updated', { from: 2, to: null })).toBe('cleared the labour hours');
    expect(d('consent_changed', { to: true })).toBe('recorded the customer’s consent to publish');
    expect(d('consent_changed', { to: false })).toBe('withdrew consent to publish');
    expect(d('assigned', { name: 'Kevin' })).toBe('assigned Kevin to the job');
    expect(d('unassigned', { name: 'Kevin' })).toBe('took Kevin off the job');
    expect(d('published', { slug: 'x' })).toBe('published the job to the website');
    expect(d('unpublished', { slug: 'x' })).toBe('took the job off the website');
    expect(d('status_changed', { from: 'in_repair', to: 'awaiting_review' })).toBe(
      'submitted the job for review',
    );
    expect(d('status_changed', { from: 'awaiting_review', to: 'completed' })).toBe(
      'approved and completed the job',
    );
    expect(d('status_changed', { from: 'awaiting_review', to: 'in_repair' })).toBe(
      'sent the job back',
    );
  });
});

describe('actorLabel', () => {
  it('shows name · role, or System when nobody was signed in', () => {
    expect(actorLabel({ actor_name: 'Kevin', actor_role: 'staff' })).toBe('Kevin · staff');
    expect(actorLabel({ actor_name: 'Paul', actor_role: null })).toBe('Paul');
    expect(actorLabel({ actor_name: null, actor_role: null })).toBe('System');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-01T10:00:00Z');
  it('reads naturally for recent times', () => {
    expect(timeAgo('2026-10-01T09:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-10-01T09:50:00Z', now)).toBe('10 min ago');
    expect(timeAgo('2026-10-01T07:00:00Z', now)).toBe('3 h ago');
    expect(timeAgo('2026-09-29T10:00:00Z', now)).toBe('2 d ago');
  });
  it('falls back to a date after a week', () => {
    expect(timeAgo('2026-09-01T10:00:00Z', now)).toMatch(/2026/);
  });
});
