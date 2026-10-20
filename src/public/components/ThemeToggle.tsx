import { useTheme } from '../../shared/theme';

/**
 * Header light/dark toggle for the public site. One tap switches scheme; picking the
 * scheme the phone already uses goes back to following the phone ("system"), so a
 * visitor is never stuck on a pinned theme by accident.
 *
 * The moon (shown in light) and sun (shown in dark) are swapped by CSS (`.when-light` /
 * `.when-dark` in index.css), so prerendered pages show the right icon before
 * hydration. The name stays "Dark theme"; `aria-pressed` carries the state.
 */
export function ThemeToggle() {
  const { resolved, system, setPref } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      aria-label="Dark theme"
      aria-pressed={resolved === 'dark'}
      title={`Switch to ${next} theme`}
      onClick={() => setPref(next === system ? 'system' : next)}
      className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-md border border-[color:var(--color-line)] text-[color:var(--color-ink)] hover:border-signal"
    >
      <svg
        className="when-light"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg
        className="when-dark"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
