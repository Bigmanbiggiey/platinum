import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { signIn } from '../../shared/supabase/auth';
import { DatumMark } from '../brand/AdminBrand';
import { PasswordInput } from '../components/PasswordInput';

export function LoginPage() {
  const { loading, session } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) {
    const to = (location.state as { from?: string } | null)?.from ?? '/admin';
    return <Navigate to={to} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setError(error);
  };

  return (
    <div
      className="grid min-h-dvh place-items-center bg-graphite px-6 text-paper"
      data-theme="dark"
    >
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
        <div className="flex items-center gap-3 text-paper">
          <DatumMark className="h-10 w-10" />
          <div className="leading-none">
            <span className="block text-lg font-bold tracking-tight">Platinum Point</span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.3em] text-platinum">
              Automotive Engineering · Admin
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <label className="block text-sm font-semibold">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate bg-slate/40 px-3 py-2 outline-none focus:border-signal"
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <div className="mt-1">
            <PasswordInput
              autoComplete="current-password"
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
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm text-platinum">
          <Link to="/admin/forgot" className="underline">
            Forgot password?
          </Link>
        </p>
      </form>
    </div>
  );
}
