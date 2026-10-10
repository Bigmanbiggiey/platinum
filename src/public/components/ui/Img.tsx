import { mediaSrcSet, mediaUrl } from '../../../shared/content/media';
import type { MediaRow } from '../../../shared/supabase/types';

/**
 * Responsive image for a `media` row. Renders a tasteful placeholder tile when there
 * is no image yet (common in early Phase 2 — content strategy §9).
 */
export function Img({
  media,
  className = '',
  sizes = '(min-width: 768px) 640px, 100vw',
  eager = false,
}: {
  media: MediaRow | null | undefined;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  if (!media) {
    return (
      <div
        className={`flex aspect-[4/3] items-center justify-center bg-[color:var(--color-surface)] ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100" className="h-10 w-10 opacity-40" fill="none">
          <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="3" />
          <path d="M50 24 68 58H32Z" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
    );
  }
  // Stored copies, not on-the-fly transforms — see shared/content/media.ts.
  const src = mediaUrl(media, 960) ?? undefined;
  const srcSet = mediaSrcSet(media);
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={media.alt_text}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  );
}
