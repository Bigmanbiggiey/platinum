import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './index.css';

// Entry for vite-react-ssg: prerenders the public routes at build time and hydrates
// the same tree in the browser (ADR-0003).
export const createRoot = ViteReactSSG({ routes });

/**
 * Belt and braces: never prerender anything under /admin. The admin is not in this
 * route table at all — it has its own client-only entry (admin.html).
 */
export function includedRoutes(paths: string[]): string[] {
  return paths.filter((path) => !path.startsWith('/admin'));
}
