/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Set in .env.local (not committed). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (publishable) key — safe for the browser; RLS is the boundary. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
