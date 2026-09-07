import type { RouteRecord } from 'vite-react-ssg';
import { PublicLayout } from './public/PublicLayout';
import { HomePage, homeLoader } from './public/pages/HomePage';
import { ServicesPage, servicesLoader } from './public/pages/ServicesPage';
import {
  ServiceDetailPage,
  serviceDetailLoader,
  serviceStaticPaths,
} from './public/pages/ServiceDetailPage';
import { PortfolioPage, portfolioLoader } from './public/pages/PortfolioPage';
import {
  PortfolioDetailPage,
  portfolioDetailLoader,
  portfolioStaticPaths,
} from './public/pages/PortfolioDetailPage';
import { TestimonialsPage, testimonialsLoader } from './public/pages/TestimonialsPage';
import { ServiceAreasPage, serviceAreasLoader } from './public/pages/ServiceAreasPage';
import { AboutPage, aboutLoader } from './public/pages/AboutPage';
import { ContactPage, contactLoader } from './public/pages/ContactPage';
import { BookPage, bookLoader } from './public/pages/BookPage';
import { RequestServicePage } from './public/pages/RequestServicePage';
import { RequestInspectionPage } from './public/pages/RequestInspectionPage';
import { PrivacyPage, privacyLoader } from './public/pages/PrivacyPage';
import { NotFoundPage } from './public/pages/NotFoundPage';

/**
 * Route table (ADR-0010). Public routes prerender via vite-react-ssg (ADR-0003) with
 * their loader data baked in; `/admin/*` is a lazy noindex chunk excluded from
 * prerender in main.tsx.
 */
export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, loader: homeLoader, element: <HomePage /> },
      { path: 'services', loader: servicesLoader, element: <ServicesPage /> },
      {
        path: 'services/:slug',
        loader: serviceDetailLoader,
        element: <ServiceDetailPage />,
        getStaticPaths: serviceStaticPaths,
      },
      { path: 'portfolio', loader: portfolioLoader, element: <PortfolioPage /> },
      {
        path: 'portfolio/:slug',
        loader: portfolioDetailLoader,
        element: <PortfolioDetailPage />,
        getStaticPaths: portfolioStaticPaths,
      },
      { path: 'testimonials', loader: testimonialsLoader, element: <TestimonialsPage /> },
      { path: 'service-areas', loader: serviceAreasLoader, element: <ServiceAreasPage /> },
      { path: 'about', loader: aboutLoader, element: <AboutPage /> },
      { path: 'contact', loader: contactLoader, element: <ContactPage /> },
      { path: 'book', loader: bookLoader, element: <BookPage /> },
      { path: 'request-service', element: <RequestServicePage /> },
      { path: 'request-inspection', element: <RequestInspectionPage /> },
      { path: 'privacy', loader: privacyLoader, element: <PrivacyPage /> },
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
