import { useId } from 'react';
import { useTheme, type ThemePref } from './theme';

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Light / Dark / System picker, shared by the public footer and the admin header.
 * Native radios (arrow keys, one tab stop, announced as a group) styled as a segmented
 * control. "System" says what it currently resolves to. `compact` shows icons only.
 */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { pref, system, setPref } = useTheme();
  const name = useId();

  return (
    <fieldset className="flex items-center gap-2">
      <legend
        className={
          compact
            ? 'sr-only'
            : 'float-left mr-1 font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]'
        }
      >
        Theme
      </legend>
      <div className="inline-flex rounded-button border border-[color:var(--color-line)] p-0.5">
        {OPTIONS.map((o) => {
          const text = o.value === 'system' ? `System (currently ${system})` : o.label;
          return (
            <label
              key={o.value}
              title={compact ? text : undefined}
              className={`flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2 py-1 text-xs font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[color:var(--color-accent)] ${
                pref === o.value
                  ? 'bg-[color:var(--color-raised)] text-[color:var(--color-ink)]'
                  : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={pref === o.value}
                onChange={() => setPref(o.value)}
                className="sr-only"
              />
              <ThemeIcon kind={o.value} />
              <span className={compact ? 'sr-only' : ''}>
                {o.label}
                {o.value === 'system' && <span className="sr-only"> (currently {system})</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ThemeIcon({ kind }: { kind: ThemePref }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (kind === 'light')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (kind === 'dark')
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
