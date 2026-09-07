/**
 * Confirmed business facts (owner, 2026-09-07 — see docs/product-definition.md §0.1).
 *
 * Phase 1 constant. In Phase 2 this is replaced by the `site_settings` row so the
 * owner can edit it without a developer. Keep it in one place until then.
 */
export const BUSINESS = {
  name: 'Platinum Point Automotive Engineering',
  owner: 'Paul Ndirangu Gatama',
  /** Dialable form for tel: links. */
  phoneE164: '+254722322870',
  /** Human-readable form for display. */
  phoneDisplay: '+254 722 322870',
  email: 'gatama98p@gmail.com',
  baseArea: 'Kitengela',
  baseAreaDetail: 'Near Shell Kitengela Service Station, Yukos',
  serviceAreaSummary: 'Kitengela and its environs, and anywhere in Kenya by arrangement',
  whatsappUrl: 'https://wa.me/254722322870',
  /** Confirmed 2026-09-07. Displayed on Contact + emitted as schema.org openingHours. */
  hours: [
    { days: 'Mon – Sat', open: '09:00', close: '19:30', label: '9:00 AM – 7:30 PM' },
    { days: 'Sunday', open: '14:45', close: '19:30', label: '2:45 PM – 7:30 PM' },
  ],
} as const;
