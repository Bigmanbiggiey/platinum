import { useState } from 'react';
import { Button } from './ui';
import { inviteEmailUrl, inviteMessage, whatsappShareUrl } from '../lib/inviteShare';
import type { InviteResult } from '../lib/team';

const shareLink =
  'inline-flex items-center justify-center rounded-md border border-[color:var(--color-line)] px-3 py-1.5 text-sm font-semibold text-[color:var(--color-ink)] hover:border-signal';

/** The invite link + Copy / WhatsApp / Email (spec §6.4). */
export function InviteLinkPanel({ result }: { result: InviteResult }) {
  const [copied, setCopied] = useState(false);
  const message = inviteMessage(result.displayName, result.inviteUrl, result.existed);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded border border-teal/40 bg-teal/10 p-3 text-sm">
      <p className="text-[color:var(--color-ink)]">
        {result.existed
          ? `${result.displayName} already had an account — this link lets them set a new password and sign in.`
          : `Invite for ${result.displayName} is ready. Send them this link — they choose their own password:`}
      </p>
      <code className="block break-all rounded bg-slate px-2 py-1 font-mono text-[11px]">
        {result.inviteUrl}
      </code>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy link'}</Button>
        <a
          className={shareLink}
          href={whatsappShareUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
        <a className={shareLink} href={inviteEmailUrl(result.email, message)}>
          Email
        </a>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        The link works once and expires after 24 hours. If it expires, create the invite again to
        get a fresh link.
      </p>
    </div>
  );
}
