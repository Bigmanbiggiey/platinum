/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Serve admin.html for /admin and /admin/* in `vite` (dev) and `vite preview`, mirroring
 * the vercel.json rewrite. Without it both fall back to index.html (the public entry),
 * which has no admin routes.
 */
function adminEntryFallback(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = req.url?.split('?')[0] ?? '';
    if (path === '/admin' || path.startsWith('/admin/')) req.url = '/admin.html';
    next();
  };
  return {
    name: 'admin-entry-fallback',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

// Single Vite app, two HTML entries (ADR-0010):
// - index.html → src/main.tsx: public routes, prerendered + hydrated by vite-react-ssg (ADR-0003).
// - admin.html → src/admin/main.tsx: the admin, client-only (never prerendered, never hydrated).
export default defineConfig({
  plugins: [react(), tailwindcss(), adminEntryFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@public': fileURLToPath(new URL('./src/public', import.meta.url)),
      '@admin': fileURLToPath(new URL('./src/admin', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // vite-react-ssg adds `app: index.html` for the client build and merges this in;
      // its server (prerender) build uses `build.ssr`, which takes precedence over input.
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
