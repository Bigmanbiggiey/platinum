// Platinum Point — pure helpers for the admin-invite Edge Function (spec §6).
//
// No Deno globals and no jsr: imports here: this file is also imported by the Vitest
// suite (src/admin/lib/inviteServer.test.ts).

export type InviteRole = 'owner' | 'staff';
export type InviteLinkType = 'invite' | 'recovery';

export interface InviteRequest {
  email: string;
  displayName: string;
  role: InviteRole;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates the JSON body `{ email, display_name, role? }`. */
export function parseInviteRequest(
  body: unknown,
):
  | { ok: true; value: InviteRequest }
  | { ok: false; error: 'bad-email' | 'bad-name' | 'bad-role' } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'bad-email' };
  const displayName = typeof b.display_name === 'string' ? b.display_name.trim() : '';
  if (!displayName || displayName.length > 80) return { ok: false, error: 'bad-name' };
  const role: InviteRole | null =
    b.role === undefined || b.role === 'staff' ? 'staff' : b.role === 'owner' ? 'owner' : null;
  if (!role) return { ok: false, error: 'bad-role' };
  return { ok: true, value: { email, displayName, role } };
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

/**
 * `${ADMIN_SITE_URL}/admin/accept-invite?token_hash=…&type=…` — built here, never by
 * Supabase, so it can't fall back to the project Site URL (localhost) or the caller's
 * Origin. Only the origin of the configured URL is used.
 */
export function buildAcceptUrl(
  siteUrl: string | undefined,
  tokenHash: string,
  type: InviteLinkType,
): string {
  if (!siteUrl) throw new Error('ADMIN_SITE_URL is not set.');
  let base: URL;
  try {
    base = new URL(siteUrl);
  } catch {
    throw new Error('ADMIN_SITE_URL is not a valid URL.');
  }
  if (base.protocol !== 'https:') throw new Error('ADMIN_SITE_URL must use https.');
  if (LOCAL_HOSTS.has(base.hostname)) throw new Error('ADMIN_SITE_URL must not point at localhost.');
  if (!tokenHash) throw new Error('Missing token.');
  const url = new URL('/admin/accept-invite', base.origin);
  url.searchParams.set('token_hash', tokenHash);
  url.searchParams.set('type', type);
  return url.toString();
}

/** generateLink({ type: 'invite' }) fails this way when the email already has an account. */
export function isAlreadyRegistered(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return error.code === 'email_exists' || /already/i.test(error.message ?? '');
}
