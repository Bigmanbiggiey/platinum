import type { RouteRecord } from 'vite-react-ssg';
import { PublicLayout } from './public/PublicLayout';
import { HomePage } from './public/pages/HomePage';
import { NotFoundPage } from './public/pages/NotFoundPage';

/**
 * Route table for the single app (ADR-0010).
 *
 * - Public routes live under the `PublicLayout` and are prerendered (ADR-0003).
 * - `/admin/*` is a lazily-loaded chunk, excluded from prerender in `main.tsx`
 *   (`includedRoutes`) and marked `noindex` in `AdminLayout`.
 */
export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      // Prerender a static 404 document as well.
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/*',
    lazy: () => import('./admin/AdminEntry'),
  },
];

export default routes;
