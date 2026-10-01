import { describe, it, expect } from 'vitest';
import {
  buildAcceptUrl,
  isAlreadyRegistered,
  parseInviteRequest,
} from '../../../supabase/functions/_shared/invite.ts';

describe('parseInviteRequest', () => {
  it('normalises email + name and defaults the role to staff', () => {
    expect(parseInviteRequest({ email: '  Kevin@Example.COM ', display_name: ' Kevin ' })).toEqual({
      ok: true,
      value: { email: 'kevin@example.com', displayName: 'Kevin', role: 'staff' },
    });
  });

  it('accepts the owner role', () => {
    const r = parseInviteRequest({ email: 'a@b.co', display_name: 'Ann', role: 'owner' });
    expect(r).toEqual({ ok: true, value: { email: 'a@b.co', displayName: 'Ann', role: 'owner' } });
  });

  it('rejects a bad email', () => {
    expect(parseInviteRequest({ email: 'nope', display_name: 'X' })).toEqual({
      ok: false,
      error: 'bad-email',
    });
    expect(parseInviteRequest(null)).toEqual({ ok: false, error: 'bad-email' });
  });

  it('requires a display name (spec §10.2) of at most 80 characters', () => {
    expect(parseInviteRequest({ email: 'a@b.co', display_name: '   ' })).toEqual({
      ok: false,
      error: 'bad-name',
    });
    expect(parseInviteRequest({ email: 'a@b.co' })).toEqual({ ok: false, error: 'bad-name' });
    expect(parseInviteRequest({ email: 'a@b.co', display_name: 'x'.repeat(81) })).toEqual({
      ok: false,
      error: 'bad-name',
    });
  });

  it('rejects an unknown role', () => {
    expect(parseInviteRequest({ email: 'a@b.co', display_name: 'A', role: 'admin' })).toEqual({
      ok: false,
      error: 'bad-role',
    });
  });
});

describe('buildAcceptUrl', () => {
  it('builds the accept-invite link from the configured site URL', () => {
    expect(buildAcceptUrl('https://platinum-point.vercel.app', 'abc123', 'invite')).toBe(
      'https://platinum-point.vercel.app/admin/accept-invite?token_hash=abc123&type=invite',
    );
  });

  it('ignores any path or trailing slash on the base and encodes the token', () => {
    expect(buildAcceptUrl('https://example.com/some/path/', 'a b&c', 'recovery')).toBe(
      'https://example.com/admin/accept-invite?token_hash=a+b%26c&type=recovery',
    );
  });

  it('refuses a missing, invalid, non-https or localhost base URL', () => {
    expect(() => buildAcceptUrl(undefined, 't', 'invite')).toThrow(/not set/);
    expect(() => buildAcceptUrl('not a url', 't', 'invite')).toThrow(/valid URL/);
    expect(() => buildAcceptUrl('http://platinum-point.vercel.app', 't', 'invite')).toThrow(
      /https/,
    );
    expect(() => buildAcceptUrl('https://localhost:5173', 't', 'invite')).toThrow(/localhost/);
    expect(() => buildAcceptUrl('https://127.0.0.1', 't', 'invite')).toThrow(/localhost/);
  });

  it('refuses an empty token', () => {
    expect(() => buildAcceptUrl('https://example.com', '', 'invite')).toThrow(/token/);
  });
});

describe('isAlreadyRegistered', () => {
  it('recognises the email_exists code or an "already" message', () => {
    expect(isAlreadyRegistered({ code: 'email_exists', message: 'x' })).toBe(true);
    expect(
      isAlreadyRegistered({
        message: 'A user with this email address has already been registered',
      }),
    ).toBe(true);
    expect(isAlreadyRegistered({ message: 'rate limited' })).toBe(false);
    expect(isAlreadyRegistered(null)).toBe(false);
  });
});
