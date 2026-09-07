import { Outlet } from 'react-router-dom';

/**
 * Route-guard STUB. Phase 1 has no authentication — this renders its children
 * unconditionally and shows a notice. Real Supabase Auth + redirect-to-login arrive
 * in Phase 3 (ADR-0007).
 */
export function RequireAuth() {
  return (
    <>
      <p className="mb-6 rounded border border-signal/40 bg-signal/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-signal">
        Auth not implemented — Phase 3
      </p>
      <Outlet />
    </>
  );
}
