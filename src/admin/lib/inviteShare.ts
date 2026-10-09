/** Share an invite link by WhatsApp or the owner's own email app (spec §6.4, D7, D9). */

export function inviteMessage(name: string, link: string, existed = false): string {
  const first = name.trim().split(/\s+/)[0] || 'there';
  return existed
    ? `Hi ${first}, here is your link to set a new password for the Platinum Point admin: ${link}`
    : `Hi ${first}, you've been invited to the Platinum Point admin. Open this link to set your password: ${link}`;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export const INVITE_EMAIL_SUBJECT = 'Your Platinum Point admin invite';

/** Opens the owner's email app with the message pre-filled. No server email. */
export function inviteEmailUrl(email: string, message: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(
    INVITE_EMAIL_SUBJECT,
  )}&body=${encodeURIComponent(message)}`;
}

const ERRORS: Record<string, string> = {
  forbidden: 'Only an active owner can invite people.',
  'not-configured':
    'Invites are not set up yet: the ADMIN_SITE_URL secret is missing or invalid (see docs/pick-up-here.md).',
  'bad-email': 'Enter a valid email address.',
  'bad-name': "Enter the person's name (up to 80 characters).",
  'bad-role': 'Pick Staff or Owner.',
  'cannot-invite-self': "That's your own email — you already have access.",
  'would-demote-owner':
    'That person is already an owner. Invite them as Owner, or change their role on the Team list.',
};

export function inviteErrorMessage(code: string | undefined): string {
  if (!code) return 'Invite failed.';
  return ERRORS[code] ?? code;
}
