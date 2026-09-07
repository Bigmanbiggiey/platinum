import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './index.css';

// Entry for vite-react-ssg: prerenders the public routes at build time and hydrates
// the same tree in the browser (ADR-0003).
export const createRoot = ViteReactSSG({ routes });

/**
 * Keep the admin out of the static prerender. It ships as a client-only lazy chunk
 * and must never be crawled or turned into HTML files.
 */
export function includedRoutes(paths: string[]): string[] {
  return paths.filter((path) => !path.startsWith('/admin'));
}
