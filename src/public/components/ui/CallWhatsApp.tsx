import { ButtonAnchor } from './Button';
import { trackCta } from '../../../shared/analytics';
import { BUSINESS } from '../../../shared/business';

/**
 * The two primary contact CTAs. `context` is passed to the WhatsApp pre-fill and to
 * the analytics event so we can see which page drove the contact.
 */
export function CallWhatsApp({
  context = 'site',
  size = 'md',
  compact = false,
  className = '',
}: {
  context?: string;
  size?: 'sm' | 'md';
  /** Short "Call" label instead of the full number — for tight spots like the header. */
  compact?: boolean;
  className?: string;
}) {
  const waText = encodeURIComponent(
    `Hi Platinum Point, I found you online (${context}) and would like to ask about a vehicle.`,
  );
  const pad = size === 'sm' ? 'px-3 py-2 text-sm' : '';
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <ButtonAnchor
        href={`tel:${BUSINESS.phoneE164}`}
        variant="primary"
        className={pad}
        aria-label={`Call ${BUSINESS.phoneDisplay}`}
        onClick={() => trackCta('call_click', { context })}
      >
        {compact ? 'Call' : `Call ${BUSINESS.phoneDisplay}`}
      </ButtonAnchor>
      <ButtonAnchor
        href={`${BUSINESS.whatsappUrl}?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        variant="accent"
        className={pad}
        onClick={() => trackCta('whatsapp_click', { context })}
      >
        WhatsApp
      </ButtonAnchor>
    </div>
  );
}
