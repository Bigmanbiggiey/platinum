import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  cleanUrls?: boolean;
  rewrites?: { source: string; destination: string }[];
};

describe('vercel.json', () => {
  // With cleanUrls on, a rewrite to "/admin.html" is not served — every hard load of a
  // deep admin URL (e.g. the invite link /admin/accept-invite) returned the public 404.
  // Rewrites must use the clean path ("/admin"), which serves dist/admin.html.
  it('rewrites deep admin URLs to the clean admin entry', () => {
    expect(config.rewrites).toContainEqual({ source: '/admin/:path*', destination: '/admin' });
  });

  it('never rewrites to a .html file while cleanUrls is on', () => {
    if (!config.cleanUrls) return;
    for (const r of config.rewrites ?? []) expect(r.destination).not.toMatch(/\.html$/);
  });
});
