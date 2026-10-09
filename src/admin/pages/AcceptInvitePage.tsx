import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { updatePassword, verifyInviteToken, type InviteLinkType } from '../../shared/supabase/auth';
import { DatumMark } from '../brand/AdminBrand';
import { PasswordInput } from '../components/PasswordInput';

const LINK_TYPES: readonly InviteLinkType[] = ['invite', 'recovery'];

/**
 * `/admin/accept-invite?token_hash=…&type=invite|recovery` (spec §6.1).
 * Opening the page consumes nothing; the token is verified only on submit.
 */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenHash = params.get('token_hash') ?? '';
  const rawType = params.get('type');
  const type = LINK_TYPES.find((t) => t === rawType);

  const [password, setPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!tokenHash || !type) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold tracking-tight">This link is incomplete</h1>
        <p className="text-sm text-platinum">
          Open the full link from your invite message, or ask the owner for a new invite link.
        </p>
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold tracking-tight">This link has expired</h1>
        <p className="text-sm text-platinum">
          It was already used or is too old. Ask the owner for a new invite link.
        </p>
        <a href="/admin/login" className="text-sm font-semibold text-signal underline">
          Go to sign in
        </a>
      </Shell>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (!verified) {
        const v = await verifyInviteToken(tokenHash, type);
        if (v.error) {
          setExpired(true);
          return;
        }
        // The token is now spent; a retry after a password error must not re-verify.
        setVerified(true);
      }
      const u = await updatePassword(password);
      if (u.error) {
        setError(u.error);
        return;
      }
      navigate('/admin', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={onSubmit} className="space-y-4">
        {type === 'invite' ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              You&apos;ve been invited to the Platinum Point admin
            </h1>
            <p className="text-sm text-platinum">
              Choose a password to finish setting up your account.
            </p>
          </>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        )}
        <div>
          <label htmlFor="accept-password" className="block text-sm font-semibold">
            Choose a password
          </label>
          <div className="mt-1">
            <PasswordInput
              id="accept-password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-signal">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Set password and sign in'}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid min-h-dvh place-items-center bg-graphite px-6 text-paper"
      data-theme="dark"
    >
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <DatumMark className="h-9 w-9" />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-platinum">
            Platinum Point · Admin
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
