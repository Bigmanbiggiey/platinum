import { useEffect, useState } from 'react';
import { checkSupabaseConnection } from '../../shared/supabase/client';

type ConnState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'not-configured' }
  | { status: 'error'; reason: string };

/**
 * Phase 1 dashboard placeholder. Its only real job is the Supabase connectivity
 * check (a throwaway read — no schema exists yet). Real dashboard = Phase 3.
 */
export function AdminDashboardPage() {
  const [conn, setConn] = useState<ConnState>({ status: 'checking' });

  useEffect(() => {
    let active = true;
    void checkSupabaseConnection().then((res) => {
      if (!active) return;
      if (res.ok) setConn({ status: 'ok' });
      else if (res.reason === 'not-configured') setConn({ status: 'not-configured' });
      else setConn({ status: 'error', reason: res.reason });
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-3 text-sm text-platinum">
        Skeleton. Clients, vehicles, service requests, schedule and CMS modules are built in Phase
        3.
      </p>

      <div className="mt-8 rounded-lg border border-slate/70 bg-slate/40 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
          Supabase connection
        </p>
        <p className="mt-2 text-sm" data-testid="supabase-conn-status">
          {conn.status === 'checking' && 'Checking…'}
          {conn.status === 'ok' && '✓ Connected — project reachable with the anon key.'}
          {conn.status === 'not-configured' &&
            'Not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.'}
          {conn.status === 'error' && `✗ Could not reach the project (${conn.reason}).`}
        </p>
      </div>
    </section>
  );
}
