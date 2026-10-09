import { describe, it, expect } from 'vitest';
import {
  INVITE_EMAIL_SUBJECT,
  inviteEmailUrl,
  inviteErrorMessage,
  inviteMessage,
  whatsappShareUrl,
} from './inviteShare';

const LINK = 'https://platinum-point.vercel.app/admin/accept-invite?token_hash=abc&type=invite';

describe('inviteMessage', () => {
  it('greets by first name and includes the link', () => {
    expect(inviteMessage('Kevin Otieno', LINK)).toBe(
      `Hi Kevin, you've been invited to the Platinum Point admin. Open this link to set your password: ${LINK}`,
    );
  });
  it('words a re-invite of an existing account as a password reset', () => {
    expect(inviteMessage('Ann', LINK, true)).toBe(
      `Hi Ann, here is your link to set a new password for the Platinum Point admin: ${LINK}`,
    );
  });
});

describe('whatsappShareUrl', () => {
  it('encodes the whole message, keeping the link intact', () => {
    const url = whatsappShareUrl(inviteMessage('Kevin', LINK));
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    // A bare "&type=" would be cut off by wa.me — it must be encoded.
    expect(url).not.toContain('&type=');
    const text = new URL(url).searchParams.get('text');
    expect(text).toContain(LINK);
  });
});

describe('inviteEmailUrl', () => {
  it('builds a mailto with subject and body encoded', () => {
    const msg = inviteMessage('Kevin', LINK);
    const url = inviteEmailUrl(' kevin@example.com ', msg);
    expect(url.startsWith('mailto:kevin@example.com?subject=')).toBe(true);
    expect(url).not.toContain('&type=');
    const query = new URLSearchParams(url.split('?').slice(1).join('?'));
    expect(query.get('subject')).toBe(INVITE_EMAIL_SUBJECT);
    expect(query.get('body')).toBe(msg);
  });
});

describe('inviteErrorMessage', () => {
  it('maps function error codes to plain words', () => {
    expect(inviteErrorMessage('forbidden')).toMatch(/only an active owner/i);
    expect(inviteErrorMessage('not-configured')).toMatch(/ADMIN_SITE_URL/);
    expect(inviteErrorMessage('bad-name')).toMatch(/name/i);
    expect(inviteErrorMessage('bad-email')).toMatch(/email/i);
    expect(inviteErrorMessage('cannot-invite-self')).toMatch(/your own/i);
    expect(inviteErrorMessage('would-demote-owner')).toMatch(/already an owner/i);
    expect(inviteErrorMessage('Something else')).toBe('Something else');
    expect(inviteErrorMessage(undefined)).toBe('Invite failed.');
  });
});
