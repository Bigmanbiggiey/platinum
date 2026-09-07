/**
 * Lightweight CTA / conversion event tracking (ADR-0011). No-ops unless an analytics
 * provider is present. Currently targets Cloudflare Web Analytics' optional
 * `cfBeacon`-style custom events; falls back to a console debug line in dev.
 */
type CtaEvent =
  | 'call_click'
  | 'whatsapp_click'
  | 'form_submit_booking'
  | 'form_submit_service'
  | 'form_submit_inspection'
  | 'form_submit_contact'
  | 'form_submit_testimonial';

interface CfAnalytics {
  trackEvent?: (name: string, data?: Record<string, unknown>) => void;
}

export function trackCta(event: CtaEvent, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const cf = (window as unknown as { __cfBeacon?: CfAnalytics }).__cfBeacon;
  try {
    cf?.trackEvent?.(event, data);
  } catch {
    /* never let analytics break a click */
  }
  if (import.meta.env.DEV) console.debug('[cta]', event, data ?? '');
}
