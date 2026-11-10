import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every component source file under src/, tests excluded. */
function sources(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) ? [path] : [];
  });
}

/**
 * String literals that look like class lists: two or more tokens, at least one with a
 * hyphen (so UI text such as "Not fixed" is skipped). Comparisons inside templates
 * (`f.outcome === 'fixed'`) are dropped first — they are values, not classes.
 */
function classLists(code: string): string[] {
  const literals = code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [];
  return literals
    .map((s) => s.slice(1, -1).replace(/[!=]==?\s*(['"])[^'"]*\1/g, ''))
    .filter((s) => {
      const tokens = s.trim().split(/\s+/);
      return tokens.length > 1 && tokens.some((t) => /\w-\w/.test(t));
    });
}

// `absolute` / `fixed` as a class, with or without a variant prefix (focus:absolute).
const POSITIONED = /(^|[\s'"`:])(absolute|fixed)(?=[\s'"`]|$)/;
// Any horizontal anchor: inset-0, inset-x-0, left-1, -left-[5px], right-0, start-0, end-0.
const ANCHORED = /(^|[\s'"`:])-?(inset|inset-x|left|right|start|end)-/;

describe('layout rules', () => {
  // A positioned element with no horizontal anchor sits at its "static position", which
  // inside a <button> is the centre: the auto-advance switch knob slid out over its label
  // on phones that way. Anchor it (left-0, inset-0, right-1 …) so it starts where meant.
  it('anchors every absolute / fixed element horizontally', () => {
    const offenders = sources().flatMap((file) =>
      classLists(readFileSync(file, 'utf8'))
        .filter((c) => POSITIONED.test(c) && !ANCHORED.test(c))
        .map((c) => `${file}: "${c.replace(/\s+/g, ' ').trim()}"`),
    );
    expect(offenders).toEqual([]);
  });

  // Checkboxes, radios, switches and icons beside a long label get squeezed on a phone
  // unless they can't shrink; the base rule in index.css covers them app-wide.
  it('keeps the no-shrink base rule for controls and icons', () => {
    const css = readFileSync('src/index.css', 'utf8').replace(/\s+/g, ' ');
    expect(css).toMatch(
      /svg, input\[type='checkbox'\], input\[type='radio'\], \[role='switch'\] \{ flex-shrink: 0; \}/,
    );
  });
});
