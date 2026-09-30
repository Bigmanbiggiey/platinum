import { describe, expect, it } from 'vitest';
import { routes } from './routes';

/** Every path in the public route table, flattened. */
function allPaths(records: typeof routes, parent = ''): string[] {
  return records.flatMap((r) => {
    const path = r.path ? (r.path.startsWith('/') ? r.path : `${parent}/${r.path}`) : parent;
    return [path, ...(r.children ? allPaths(r.children as typeof routes, path) : [])];
  });
}

describe('public route table', () => {
  // The public entry always HYDRATES prerendered HTML. If the admin were mounted here,
  // a hard load of /admin would hydrate the admin over the Home page's markup
  // (React #418). The admin has its own client-only entry: admin.html.
  it('does not mount the admin', () => {
    expect(allPaths(routes).filter((p) => p.startsWith('/admin'))).toEqual([]);
  });
});
