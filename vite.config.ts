/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Single Vite app for the public site + admin (ADR-0010).
// Public routes are prerendered via vite-react-ssg (ADR-0003); the admin is a
// lazy-loaded, noindex chunk excluded from prerender (see src/main.tsx).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@public': fileURLToPath(new URL('./src/public', import.meta.url)),
      '@admin': fileURLToPath(new URL('./src/admin', import.meta.url)),
    },
  },
  build: {
    // Keep the admin out of the initial public payload; name its chunk for clarity.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/admin/')) return 'admin';
        },
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
