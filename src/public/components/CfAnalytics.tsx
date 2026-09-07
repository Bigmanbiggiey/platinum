import { Head } from 'vite-react-ssg';

/**
 * Cloudflare Web Analytics beacon (ADR-0011) — cookieless, no consent banner.
 * Renders nothing unless VITE_CF_ANALYTICS_TOKEN is set, so local/dev builds and
 * pre-token deploys stay clean.
 */
export function CfAnalytics() {
  const token = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
  if (!token) return null;
  return (
    <Head>
      <script
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={JSON.stringify({ token })}
      />
    </Head>
  );
}
