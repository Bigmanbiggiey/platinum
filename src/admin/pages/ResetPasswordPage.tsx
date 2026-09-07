import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../../shared/supabase/auth';
import { DatumMark } from '../brand/AdminBrand';
import { PasswordInput } from '../components/PasswordInput';

/**
 * Landed on from the password-reset email. Supabase puts the recovery session in
 * place from the URL fragment; we just collect the new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) setError(error);
    else navigate('/admin');
  };

  return (
    <div
      className="grid min-h-dvh place-items-center bg-graphite px-6 text-paper"
      data-theme="dark"
    >
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <DatumMark className="h-9 w-9" />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-platinum">
            Platinum Point · Admin
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        <label className="block text-sm font-semibold">
          New password
          <div className="mt-1">
            <PasswordInput
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </label>
        {error && <p className="text-sm text-signal">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
