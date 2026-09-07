import { Head } from 'vite-react-ssg';
import { canonical, SITE_ORIGIN } from '../../../shared/seo';

/**
 * When VITE_SITE_NOINDEX is set (staging / not-yet-public builds) every page is
 * `noindex,nofollow` regardless of the per-page `noindex` prop.
 */
const FORCE_NOINDEX = Boolean(import.meta.env.VITE_SITE_NOINDEX);

/**
 * Per-page <head>: title, description, canonical, Open Graph, and optional JSON-LD.
 * `path` is the route path (for the canonical URL). `noindex` for utility pages.
 */
export function SeoHead({
  title,
  description,
  path,
  image,
  noindex = false,
  jsonLd,
}: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}) {
  const url = canonical(path);
  const ogImage = image ?? `${SITE_ORIGIN}/favicon.svg`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Head>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta
        name="robots"
        content={FORCE_NOINDEX ? 'noindex,nofollow' : noindex ? 'noindex,follow' : 'index,follow'}
      />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Head>
  );
}
