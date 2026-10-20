/**
 * Mobile navigation check (docs/superpowers/plans/2026-10-20-mobile-nav.md, A-4).
 *
 *   npm run build && npm run preview      # in one terminal
 *   npm run check:mobile [base-url]       # default http://localhost:4173
 *
 * Drives the system Edge (or Chrome: BROWSER_CHANNEL=chrome) with touch emulation at
 * phone, landscape and tablet sizes, and checks the public menu and the admin header +
 * drawer. The admin runs with a fake session and EVERY Supabase request is answered in
 * the test browser, so nothing reaches the real project. Screenshots go to
 * tmp/mobile-nav/ (git-ignored). Exits 1 if any check fails.
 */
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const CHANNEL = process.env.BROWSER_CHANNEL ?? 'msedge';
const OUT = 'tmp/mobile-nav';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  [320, 568],
  [360, 780],
  [390, 844],
  [430, 932],
  [667, 375],
  [768, 1024],
  [1024, 768],
];
const MIN_TARGET = 44;

const failures = [];
const passes = [];
function check(ok, label) {
  (ok ? passes : failures).push(label);
}

/** The Supabase project ref the build talks to, so the fake session lands under its key. */
function supabaseRef() {
  const fromEnv = process.env.VITE_SUPABASE_URL;
  const file = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  const url = fromEnv ?? /^VITE_SUPABASE_URL=(.+)$/m.exec(file)?.[1]?.trim();
  return url ? new URL(url).hostname.split('.')[0] : null;
}

async function checkPublic(browser, w, h) {
  const tag = `public ${w}x${h}`;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    isMobile: w < 1024,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/services`, { waitUntil: 'networkidle' });

  check((await page.evaluate(() => innerWidth)) === w, `${tag}: no sideways overflow`);
  const headerOk = await page.evaluate(() =>
    [...document.querySelectorAll('header a, header button')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .every((e) => e.getBoundingClientRect().right <= innerWidth + 0.5),
  );
  check(headerOk, `${tag}: nothing in the header is cut off`);
  const publicWrapped = await page.evaluate(() => {
    const out = [];
    const header = document.querySelector('header');
    const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const tops = new Set(
        [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
      );
      if (tops.size > 1) out.push(n.textContent.trim());
    }
    return out;
  });
  check(
    publicWrapped.length === 0,
    `${tag}: nothing wraps in the header ${JSON.stringify(publicWrapped)}`,
  );
  await page.screenshot({ path: `${OUT}/public-${w}x${h}.png` });

  // Light/dark toggle: in the header at every size, next to Menu on phones, not in the footer.
  const theme = page.locator('header button[aria-label="Dark theme"]');
  const tb = await theme.boundingBox();
  check(
    !!tb && tb.width >= MIN_TARGET && tb.height >= MIN_TARGET,
    `${tag}: theme toggle in the header, ≥ ${MIN_TARGET}px`,
  );
  check(
    (await page
      .locator('footer input[type="radio"], footer button[aria-label="Dark theme"]')
      .count()) === 0,
    `${tag}: no theme control in the footer`,
  );
  if (w < 768) {
    const mb = await page.locator('header button[aria-controls="site-menu"]').boundingBox();
    check(
      !!tb && !!mb && mb.x - (tb.x + tb.width) <= 16 && Math.abs(mb.y - tb.y) <= 2,
      `${tag}: theme toggle sits next to Menu`,
    );
  }
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await theme.tap();
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    pressed: document
      .querySelector('header button[aria-label="Dark theme"]')
      .getAttribute('aria-pressed'),
  }));
  check(after.bg !== before && after.pressed === 'true', `${tag}: toggle switches to dark`);
  await page.screenshot({ path: `${OUT}/public-${w}x${h}-dark.png` });
  await theme.tap();
  await page.waitForTimeout(200);
  check(
    (await page.evaluate(() => document.documentElement.dataset.theme)) === undefined,
    `${tag}: second tap follows the device again`,
  );

  const toggle = page.locator('header button[aria-controls="site-menu"]');
  if (w >= 768) {
    check(!(await toggle.isVisible()), `${tag}: desktop nav, no Menu button`);
    await ctx.close();
    return;
  }

  const box = await toggle.boundingBox();
  check(
    box.width >= MIN_TARGET && box.height >= MIN_TARGET,
    `${tag}: Menu button ≥ ${MIN_TARGET}px (${Math.round(box.width)}×${Math.round(box.height)})`,
  );

  await toggle.tap();
  await page.waitForTimeout(600);
  const open = await page.evaluate(() => {
    const sheet = document.getElementById('site-menu');
    const links = [...(sheet?.querySelectorAll('a') ?? [])];
    const bar = [...document.querySelectorAll('div')].find(
      (e) =>
        getComputedStyle(e).position === 'fixed' &&
        e.getBoundingClientRect().bottom >= innerHeight - 1 &&
        e.textContent.includes('WhatsApp'),
    );
    return {
      shown: !!sheet,
      smallest: Math.min(...links.map((a) => a.getBoundingClientRect().height)),
      hasBook: links.some((a) => a.textContent.trim() === 'Book a service'),
      count: links.length,
      locked: getComputedStyle(document.documentElement).overflow === 'hidden',
      inert: document.getElementById('main')?.hasAttribute('inert'),
      focusInMenu: !!sheet?.contains(document.activeElement),
      sheetBottom: sheet?.getBoundingClientRect().bottom ?? 0,
      barTop: bar ? bar.getBoundingClientRect().top : innerHeight,
      opaque: sheet
        ? getComputedStyle(sheet).backgroundColor.match(/[\d.]+/g)?.[3] === undefined
        : false,
    };
  });
  check(open.shown, `${tag}: menu opens`);
  check(open.count === 8 && open.hasBook, `${tag}: 7 pages + Book a service (${open.count} links)`);
  check(
    open.smallest >= MIN_TARGET,
    `${tag}: menu links ≥ ${MIN_TARGET}px (smallest ${Math.round(open.smallest)})`,
  );
  check(open.locked && open.inert, `${tag}: page locked and inert behind the menu`);
  check(open.focusInMenu, `${tag}: focus moves into the menu`);
  check(open.sheetBottom <= open.barTop + 1, `${tag}: menu stops above the contact bar`);
  check(open.opaque, `${tag}: menu background is solid`);
  await page.screenshot({ path: `${OUT}/public-${w}x${h}-open.png` });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const afterEsc = await page.evaluate(() => ({
    closed: !document.getElementById('site-menu'),
    focusOnToggle: document.activeElement?.getAttribute('aria-controls') === 'site-menu',
    unlocked: getComputedStyle(document.documentElement).overflow !== 'hidden',
  }));
  check(
    afterEsc.closed && afterEsc.focusOnToggle && afterEsc.unlocked,
    `${tag}: Escape closes, returns focus, unlocks`,
  );

  // Tap the dimmed strip between the sheet and the contact bar, where one shows.
  await toggle.tap();
  await page.waitForTimeout(600);
  const gap = open.barTop - open.sheetBottom;
  if (gap >= 24) {
    await page.touchscreen.tap(Math.round(w / 2), Math.round(open.sheetBottom + gap / 2));
    await page.waitForTimeout(500);
    check(!(await page.locator('#site-menu').count()), `${tag}: tapping the dimmed page closes`);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  await toggle.tap();
  await page.waitForTimeout(600);
  await page.locator('#site-menu a', { hasText: 'Work' }).tap();
  await page.waitForTimeout(900);
  const nav = await page.evaluate(() => ({
    path: location.pathname,
    closed: !document.getElementById('site-menu'),
    focus: document.activeElement?.id,
  }));
  check(
    nav.path === '/portfolio' && nav.closed && nav.focus === 'main',
    `${tag}: link navigates, closes, focuses the new page`,
  );
  await ctx.close();
}

async function checkAdmin(browser, ref, w, h, role) {
  const tag = `admin ${role} ${w}x${h}`;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const id = '00000000-0000-4000-8000-000000000001';
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'check@example.test',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: id, exp, role: 'authenticated' })}.x`,
    refresh_token: 'x',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    user,
  };

  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    isMobile: w < 1024,
    hasTouch: true,
  });
  await ctx.addInitScript(
    ([k, v]) => localStorage.setItem(k, v),
    [`sb-${ref}-auth-token`, JSON.stringify(session)],
  );
  await ctx.route(/https:\/\/[a-z0-9]+\.supabase\.co\//, (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) return route.fulfill({ json: user });
    if (url.includes('/rest/v1/profile'))
      return route.fulfill({
        json: {
          user_id: id,
          email: 'check@example.test',
          display_name: 'Paul Ndirangu Gatama',
          role,
          is_active: true,
        },
      });
    return route.fulfill({ headers: { 'content-range': '0-0/0' }, json: [] });
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const head = await page.evaluate(() => {
    const header = document.querySelector('header');
    const items = [...header.querySelectorAll('a, button')].filter(
      (e) => e.getBoundingClientRect().width > 0,
    );
    return {
      innerWidth,
      clipped: items
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5)
        .map((e) => e.textContent.trim() || e.getAttribute('aria-label')),
      // A text node laid out on more than one line has wrapped.
      wrapped: (() => {
        const out = [];
        const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const tops = new Set(
            [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
          );
          if (tops.size > 1) out.push(n.textContent.trim());
        }
        return out;
      })(),
    };
  });
  check(head.innerWidth === w, `${tag}: no sideways overflow (laid out at ${head.innerWidth}px)`);
  check(
    head.clipped.length === 0,
    `${tag}: nothing cut off in the header ${JSON.stringify(head.clipped)}`,
  );
  check(
    head.wrapped.length === 0,
    `${tag}: nothing wraps in the header ${JSON.stringify(head.wrapped)}`,
  );
  await page.screenshot({ path: `${OUT}/admin-${role}-${w}x${h}.png` });

  if (w < 768) {
    const toggle = page.locator('header button[aria-controls="admin-drawer"]');
    const box = await toggle.boundingBox();
    check(
      box.width >= MIN_TARGET && box.height >= MIN_TARGET,
      `${tag}: Menu button ≥ ${MIN_TARGET}px`,
    );
    await toggle.tap();
    await page.waitForTimeout(500);
    const d = await page.evaluate(() => {
      const aside = document.getElementById('admin-drawer');
      const links = [...aside.querySelectorAll('nav a')];
      const account = aside.querySelector('section[aria-label="Account"]');
      return {
        smallest: Math.min(...links.map((a) => a.getBoundingClientRect().height)),
        accountShown: !!account && getComputedStyle(account).display !== 'none',
        signOutInDrawer:
          !!account &&
          [...account.querySelectorAll('button')].some(
            (b) => b.textContent.trim() === 'Sign out' && b.getBoundingClientRect().height >= 44,
          ),
        locked: getComputedStyle(document.documentElement).overflow === 'hidden',
        inert: document.getElementById('admin-main')?.hasAttribute('inert'),
        focusInDrawer: aside.contains(document.activeElement),
        clipped: [...aside.querySelectorAll('a, button, label, p')]
          .filter(
            (e) =>
              e.getBoundingClientRect().width > 0 &&
              e.getBoundingClientRect().right > aside.getBoundingClientRect().right + 0.5,
          )
          .map((e) => e.textContent.trim()),
      };
    });
    check(
      d.smallest >= MIN_TARGET,
      `${tag}: drawer links ≥ ${MIN_TARGET}px (smallest ${Math.round(d.smallest)})`,
    );
    if (w < 640)
      check(
        d.accountShown && d.signOutInDrawer,
        `${tag}: account section with Sign out in the drawer`,
      );
    check(
      d.clipped.length === 0,
      `${tag}: nothing cut off in the drawer ${JSON.stringify(d.clipped)}`,
    );
    check(
      d.locked && d.inert && d.focusInDrawer,
      `${tag}: page locked + inert, focus in the drawer`,
    );
    await page.screenshot({ path: `${OUT}/admin-${role}-${w}x${h}-drawer.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const esc = await page.evaluate(() => ({
      closed:
        document
          .querySelector('header button[aria-controls="admin-drawer"]')
          .getAttribute('aria-expanded') === 'false',
      focus: document.activeElement?.getAttribute('aria-controls') === 'admin-drawer',
    }));
    check(esc.closed && esc.focus, `${tag}: Escape closes the drawer and returns focus`);
  }
  await ctx.close();
}

const browser = await chromium.launch({ channel: CHANNEL });
/** A step that throws (element never appeared, timeout) is a failed check, not a crash. */
async function run(label, fn) {
  try {
    await fn();
  } catch (e) {
    check(false, `${label}: ${String(e.message ?? e).split(/\r?\n/)[0]}`);
  }
}

try {
  for (const [w, h] of VIEWPORTS) await run(`public ${w}x${h}`, () => checkPublic(browser, w, h));
  const ref = supabaseRef();
  if (!ref) {
    console.warn('[check-mobile] VITE_SUPABASE_URL not set — admin checks skipped.');
  } else {
    for (const [w, h] of VIEWPORTS)
      await run(`admin owner ${w}x${h}`, () => checkAdmin(browser, ref, w, h, 'owner'));
    await run('admin staff 320x568', () => checkAdmin(browser, ref, 320, 568, 'staff'));
  }
} finally {
  await browser.close();
}

for (const f of failures) console.log(`✗ ${f}`);
console.log(
  `[check-mobile] ${passes.length} passed, ${failures.length} failed. Screenshots: ${OUT}/`,
);
process.exit(failures.length ? 1 : 0);
