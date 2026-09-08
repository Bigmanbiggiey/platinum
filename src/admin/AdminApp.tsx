import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './RequireAuth';
import { AdminShell } from './AdminShell';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { RequestsPage } from './pages/RequestsPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { SchedulePage } from './pages/SchedulePage';
import { TeamPage } from './pages/TeamPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ContentHubPage } from './pages/content/ContentHubPage';
import { CopyPage } from './pages/content/CopyPage';
import { AreasPage } from './pages/content/AreasPage';
import { PartnersPage } from './pages/content/PartnersPage';
import { TestimonialsPage } from './pages/content/TestimonialsPage';
import { ServicesListPage } from './pages/content/ServicesListPage';
import { ServiceEditPage } from './pages/content/ServiceEditPage';
import { PortfolioListPage } from './pages/content/PortfolioListPage';
import { PortfolioEditPage } from './pages/content/PortfolioEditPage';
import { MediaPage } from './pages/content/MediaPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

/** Admin SPA at `/admin/*` (client-only, excluded from prerender, noindex). */
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
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="requests/:id" element={<RequestDetailPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/:id" element={<ClientDetailPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="content" element={<ContentHubPage />} />
              <Route path="content/services" element={<ServicesListPage />} />
              <Route path="content/services/:id" element={<ServiceEditPage />} />
              <Route path="content/portfolio" element={<PortfolioListPage />} />
              <Route path="content/portfolio/:id" element={<PortfolioEditPage />} />
              <Route path="content/testimonials" element={<TestimonialsPage />} />
              <Route path="content/media" element={<MediaPage />} />
              <Route path="content/copy" element={<CopyPage />} />
              <Route path="content/areas" element={<AreasPage />} />
              <Route path="content/partners" element={<PartnersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<PlaceholderPage title="Not found" wp="—" />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
