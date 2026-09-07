import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './RequireAuth';
import { AdminShell } from './AdminShell';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

/**
 * Admin SPA. Mounted at `/admin/*` (client-only, excluded from prerender, noindex).
 * Routes here are relative to `/admin`.
 */
export function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot" element={<ForgotPasswordPage />} />
          <Route path="reset" element={<ResetPasswordPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AdminShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="requests" element={<PlaceholderPage title="Requests" wp="WP5" />} />
              <Route path="schedule" element={<PlaceholderPage title="Schedule" wp="WP5" />} />
              <Route
                path="clients"
                element={<PlaceholderPage title="Clients & vehicles" wp="WP6" />}
              />
              <Route
                path="content"
                element={<PlaceholderPage title="Website content" wp="WP7–WP9" />}
              />
              <Route path="settings" element={<PlaceholderPage title="Settings" wp="WP9" />} />
              <Route path="team" element={<PlaceholderPage title="Team" wp="WP3b" />} />
            </Route>
          </Route>
          <Route path="*" element={<PlaceholderPage title="Not found" wp="—" />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
