import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../../shared/supabase/auth';

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
        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        <label className="block text-sm font-semibold">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate bg-slate/40 px-3 py-2 outline-none focus:border-signal"
          />
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
