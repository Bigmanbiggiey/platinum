import { describe, it, expect } from 'vitest';
import { BUSINESS } from './business';
import { getSupabaseEnv, isSupabaseConfigured } from './env';

describe('business constants', () => {
  it('exposes the confirmed name and dialable phone', () => {
    expect(BUSINESS.name).toBe('Platinum Point Automotive Engineering');
    expect(BUSINESS.phoneE164).toMatch(/^\+254\d{9}$/);
  });
});

describe('supabase env helper', () => {
  it('reports not-configured when env vars are absent (Phase 1 default)', () => {
    // No .env.local in CI / fresh checkout — helper must degrade gracefully, not throw.
    const env = getSupabaseEnv();
    expect(env === null || typeof env.url === 'string').toBe(true);
    expect(typeof isSupabaseConfigured()).toBe('boolean');
  });
});
