/**
 * Render the admin PWA icons (docs/superpowers/plans/2026-10-19-admin-pwa.md, Task 1)
 * from the PM monogram. Run by hand when the mark changes; the PNGs are committed:
 *
 *   node scripts/gen-admin-icons.mjs
 *
 * - admin-192 / admin-512: the favicon as-is (rounded tile), manifest `purpose: any`.
 * - admin-maskable-512: full-bleed graphite, monogram inside the central 80% safe zone,
 *   so Android's circle/squircle masks never clip the letters.
 * - apple-touch-icon-180: full-bleed (iOS applies its own rounding).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const favicon = await readFile('public/favicon.svg', 'utf8');
const inner = favicon.slice(favicon.indexOf('<g'), favicon.lastIndexOf('</svg>'));

/** Full-bleed tile with the monogram scaled about the centre. */
const fullBleed = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#14171A" />
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${inner}</g>
</svg>`;

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

const out = {
  'public/icons/admin-192.png': render(favicon, 192),
  'public/icons/admin-512.png': render(favicon, 512),
  // Letters span x 17–83 / y 20–80; at 0.75 they sit within a 25–75 box, inside the
  // 40-unit safe-zone radius.
  'public/icons/admin-maskable-512.png': render(fullBleed(0.75), 512),
  'public/icons/apple-touch-icon-180.png': render(fullBleed(0.9), 180),
};
for (const [file, png] of Object.entries(out)) {
  await writeFile(file, png);
  console.log(`[gen-admin-icons] ${file} (${png.length} bytes)`);
}
