import { describe, it, expect } from 'vitest';
import { canonical, localBusinessJsonLd, serviceJsonLd, breadcrumbJsonLd } from './seo';
import type { ServiceRow } from './supabase/types';

describe('seo helpers', () => {
  it('builds absolute canonical URLs', () => {
    expect(canonical('/services')).toMatch(/^https?:\/\/.+\/services$/);
    expect(canonical('about')).toMatch(/\/about$/);
  });

  it('emits an AutoRepair LocalBusiness block with fallbacks when settings are null', () => {
    const ld = localBusinessJsonLd(null);
    expect(ld['@type']).toBe('AutoRepair');
    expect(ld.name).toBe('Platinum Point Automotive Engineering');
    expect(ld.telephone).toBe('+254722322870');
    expect(Array.isArray(ld.openingHoursSpecification)).toBe(true);
  });

  it('emits a Service block', () => {
    const service = {
      slug: 'diagnostics',
      title: 'Vehicle Diagnostics',
      category: 'Diagnostics',
      summary: 'Find the fault.',
      seo_description: null,
    } as ServiceRow;
    const ld = serviceJsonLd(service, null);
    expect(ld['@type']).toBe('Service');
    expect(ld.name).toBe('Vehicle Diagnostics');
    expect(ld.url).toMatch(/\/services\/diagnostics$/);
  });

  it('numbers breadcrumb items from 1', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
    ]);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
  });
});
