import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../shared/supabase/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await requestPasswordReset(email.trim());
    if (error) setError(error);
    else setSent(true);
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-[color:var(--color-ground)] px-6 text-[color:var(--color-ink)]">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-[color:var(--color-muted)]">
            If that email has an account, a reset link is on its way. Follow it to set a new
            password.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-raised)]/40 px-3 py-2 outline-none focus:border-signal"
              />
            </label>
            {error && <p className="text-sm text-[color:var(--color-accent-text)]">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-graphite"
            >
              Send reset link
            </button>
          </form>
        )}
        <p className="text-sm text-[color:var(--color-muted)]">
          <Link to="/admin/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
