/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Set in .env.local (not committed). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (publishable) key — safe for the browser; RLS is the boundary. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Public origin for canonical URLs / sitemap. Defaults to a placeholder domain. */
  readonly VITE_SITE_ORIGIN?: string;
  /** Submission Edge Function URL. Defaults to `${VITE_SUPABASE_URL}/functions/v1/submit`. */
  readonly VITE_SUBMIT_URL?: string;
  /** Cloudflare Turnstile site key (public). Omitted → no widget (honeypot only). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Cloudflare Web Analytics token (public). Omitted → no analytics snippet. */
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
