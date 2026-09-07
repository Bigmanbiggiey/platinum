import { trackCta } from '../../shared/analytics';
import { BUSINESS } from '../../shared/business';

/** Persistent Call / WhatsApp bar, mobile only. */
export function MobileContactBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-[color:var(--color-line)] bg-[color:var(--color-ground)] md:hidden">
      <a
        href={`tel:${BUSINESS.phoneE164}`}
        onClick={() => trackCta('call_click', { context: 'mobile-bar' })}
        className="py-3 text-center text-sm font-semibold text-[color:var(--color-ink)]"
      >
        Call
      </a>
      <a
        href={`${BUSINESS.whatsappUrl}?text=${encodeURIComponent('Hi Platinum Point, I found you online.')}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackCta('whatsapp_click', { context: 'mobile-bar' })}
        className="bg-signal py-3 text-center text-sm font-semibold text-paper"
      >
        WhatsApp
      </a>
    </div>
  );
}
