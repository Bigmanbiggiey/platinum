import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { RequireAuth } from './RequireAuth';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

/**
 * Admin entry — loaded as a separate lazy chunk (see routes.tsx / vite.config.ts) and
 * excluded from the static prerender (main.tsx `includedRoutes`).
 *
 * Phase 1: shell only. Real Supabase Auth + the route guard land in Phase 3 (ADR-0007).
 * `RequireAuth` is a labelled stub for now.
 */
export function Component() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<RequireAuth />}>
          <Route index element={<AdminDashboardPage />} />
        </Route>
        <Route path="*" element={<AdminDashboardPage />} />
      </Routes>
    </AdminLayout>
  );
}

export default Component;
