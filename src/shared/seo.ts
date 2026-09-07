/**
 * SEO helpers — canonical site metadata + schema.org JSON-LD builders.
 * Consumed by the `SeoHead` component (src/public/components/ui/SeoHead.tsx).
 */
import { BUSINESS } from './business';
import type { ServiceRow, SiteSettingsPublicRow } from './supabase/types';

/** Public origin. Not final until the domain is chosen (§14.2 Q13); overridable via env. */
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_ORIGIN ?? 'https://platinumpoint.co.ke'
).replace(/\/$/, '');

export const canonical = (path: string): string =>
  `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;

/** Convert stored hours ({days,open,close}) to schema.org openingHours strings. */
function openingHoursSpec(settings: SiteSettingsPublicRow | null) {
  const hours = settings?.hours ?? BUSINESS.hours;
  const dayMap: Record<string, string[]> = {
    'Mon – Sat': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    Sunday: ['Sunday'],
  };
  return hours.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: dayMap[h.days] ?? [h.days],
    opens: h.open,
    closes: h.close,
  }));
}

/** LocalBusiness / AutoRepair — emitted once, on the home page. */
export function localBusinessJsonLd(settings: SiteSettingsPublicRow | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: settings?.business_name ?? BUSINESS.name,
    description: settings?.default_seo?.description ?? undefined,
    telephone: settings?.phone ?? BUSINESS.phoneE164,
    email: settings?.email ?? BUSINESS.email,
    url: SITE_ORIGIN,
    areaServed: ['Kitengela', 'Kajiado County', 'Nairobi', 'Kenya (by arrangement)'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kitengela',
      addressRegion: 'Kajiado',
      addressCountry: 'KE',
    },
    openingHoursSpecification: openingHoursSpec(settings),
    sameAs: settings?.gbp_url ? [settings.gbp_url] : undefined,
  };
}

/** Service schema for a service detail page. */
export function serviceJsonLd(service: ServiceRow, settings: SiteSettingsPublicRow | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.seo_description ?? service.summary,
    serviceType: service.category ?? 'Automotive service',
    provider: {
      '@type': 'AutoRepair',
      name: settings?.business_name ?? BUSINESS.name,
      telephone: settings?.phone ?? BUSINESS.phoneE164,
    },
    areaServed: 'Kenya',
    url: canonical(`/services/${service.slug}`),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: canonical(t.path),
    })),
  };
}
