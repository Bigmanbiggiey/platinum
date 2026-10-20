# Mobile screens — navigation fix — Findings & Implementation Plan

**Goal:** Navigation that fits and behaves properly on every phone, from 320 px to tablets,
in portrait and landscape, in light and dark mode, in both the **admin / PMS Admin app**
(fix immediately) and the **public site**.

**Guidance used:** modern-web-guidance `navigation-drawer`, `accessibility`,
`responsive-design`.

## 1. How this was explored (2026-10-20)

Live site `platinum-point.vercel.app`, driven with Playwright (system Edge) using touch
emulation and DPR 2:

- **Public nav:** 11 viewports. 320×568, 360×780, 375×667, 390×844, 412×915, 430×932,
  667×375 and 844×390 (landscape), 768×1024, 820×1180, 1024×768. Light and dark at 360
  and 390. Each run measured the header, opened the menu, scrolled, pressed Escape,
  tapped outside, tapped a link, checked focus and the Tab order.
- **Admin shell:** 320, 360, 390, 430, 667×375 and 768, for owner and staff. A fake
  session in the test browser, with **every Supabase call mocked**, so no real data was
  touched.
- **All 10 public pages** at 320, 360 and 768 checked for horizontal overflow and tap
  targets under 24 px.

## 2. Findings

Severity: **P0** = broken on real phones now · **P1** = accessibility/usability defect
· **P2** = polish.

### Admin header + drawer (what owner and staff use daily, now as an installed app)

| # | Sev | Finding | Evidence |
|---|---|---|---|
| A1 | **P0** | **The header doesn't fit any phone.** Menu button + brand + "View site ↗" + 3-way theme picker + "Sign out" need about 383 px. At **320 and 360 the page lays out 383 px wide**, so the phone zooms the whole admin out (smaller text everywhere) and **"Sign out" is cut off**. | `innerWidth` = 383 at 320 and 360. "Sign out" clipped. |
| A2 | **P0** | Even where it fits (390–430), every item wraps. **"View site ↗" breaks onto 3 lines**, the **"MOTOR SERVICES · ADMIN" descriptor onto 3 lines**, and **"Sign out" onto 2**. The header looks broken. | Screenshots at 360, 390. |
| A3 | P1 | Drawer: **Escape doesn't close it**, focus stays on the toggle, and the page behind isn't `inert`, so keyboard and screen-reader users reach hidden content. The **page scrolls behind** the open drawer. | `escapeCloses=false`, `mainInert=false`, `pageScrollLocked=false`. |
| A4 | P1 | Drawer links are **36 px** tall. That passes WCAG 2.5.8 (24 px) but is below the 44–48 px touch size phones expect. | Links 36 px. |
| A5 | P2 | The toggle's name changes ("Expand menu" / "Collapse menu") **and** it has `aria-expanded`. State is announced twice. | `accessibility` guide: don't repeat ARIA state in the name. |
| A6 | P2 | Staff have only 2 destinations (Jobs, Schedule), yet still get a hamburger drawer. | Staff drawer has 2 links. |
| ✓ | — | Things that already work: the backdrop dims the page and a tap on it closes the drawer, links close the drawer after navigating on mobile, and the 768 px icon rail is fine. | |

### Public site nav

| # | Sev | Finding | Evidence |
|---|---|---|---|
| P1 | **P0** | **The open menu isn't separated from the page.** It's part of the translucent sticky header (95 % + blur), so when the page scrolls behind it (it does: no scroll lock) the page text shows through the menu. There's no backdrop, and **tapping outside doesn't close it**. | `pageScrollsBehindMenu=true`, `tapOutsideCloses=false`. Screenshot `320 open-scrolled`. |
| P2 | P1 | **Escape doesn't close it.** No `aria-controls`. Focus stays on the toggle, and the page isn't `inert`. | `escapeCloses=false`, `controls=null`. |
| P3 | P1 | After choosing a link, focus lands on `<body>` / "Skip to content". The new page isn't announced, and keyboard users start from the top. | `focusAfterLink=BODY`. |
| P4 | P1 | **Menu links are 24 px tall** and the **toggle is 38×38**, both below comfortable thumb size (44–48 px). | Links 24 px, toggle 38 px. |
| P5 | P1 | **The current page isn't shown visually** in the mobile menu. `aria-current` is set, but there's no style for it. | `current=["Services"]`, no visual difference. |
| P6 | P1 | **Key destinations are missing** from the mobile menu: **Book a service** (the main conversion) and **Testimonials** are only in the footer. Home is only reachable via the logo. | Link list. |
| P7 | P2 | **Call/WhatsApp appear twice** when the menu is open: big buttons in the menu, and the fixed bottom bar. | Screenshot `320 open`. |
| P8 | P2 | **Landscape phones (667×375):** the menu fills the whole screen with no internal scroll. Adding links (P6) would push them under the bottom bar. | `panelBottom=321/375`. |
| P9 | P2 | Toggle labelled "Toggle menu", a vague name (should be "Menu" + `aria-expanded`). | |
| ✓ | — | Things that already work: **no horizontal overflow on any public page** at 320/360/768; the desktop nav fits from 768 px; the dark theme is correct; tapping a link closes the menu; the bottom bar doesn't hide the footer. | |

### Other mobile-screen issues (not nav, same pass)

| # | Sev | Finding |
|---|---|---|
| O1 | P2 | Footer links (phone, email, Services, Work, …) are **under 24 px tall** on every page. They pass only through WCAG's spacing exception. They need more padding for thumbs. |
| O2 | P2 | At **768 px** the home section label **"01 / 05 · INTRO" overlaps the heading** "Dealer-level work, wherever your vehicle is". |
| O3 | P2 | The bottom contact bar has no `env(safe-area-inset-bottom)` padding. It's fine today (no `viewport-fit=cover`), but it will matter if that's ever enabled. |

## 3. Decisions (for owner approval)

| Question | Proposal | Why |
|---|---|---|
| Admin header on phones | **Below `sm` (640 px): ☰ · logo · "Platinum" only, and nothing else.** "View site", the theme picker, the user's name/role and "Sign out" move into an **account section at the bottom of the drawer**. From `sm` up the header is as today, but with `whitespace-nowrap`; the "· Admin" descriptor shows only from `md`. | Fits 320 px with room to spare and keeps one-tap access. The drawer is where phone users already go. |
| Admin drawer behaviour | Keep the current slide-in drawer + backdrop, and add **Escape**, **focus into the drawer on open / back to ☰ on close**, **`inert` on `<main>`**, **scroll lock** (mobile only, never for the desktop rail), **48 px links**, and a static **"Menu"** label + `aria-expanded` + `aria-controls`. | Fixes A3–A5 with small, low-risk changes. |
| Swipe-to-close drawer (guide's popover + scroll-snap pattern) | **Later (Phase B)**, as its own PR. | Feels native in the installed app, but it's a rebuild of the drawer. The immediate fix shouldn't wait for it. |
| Staff navigation | **Phase B:** staff get a **bottom tab bar** (Jobs · Schedule · Account) instead of a hamburger. | Two destinations don't need a drawer. Tabs are one tap. |
| Public menu style | **Full-width sheet under the header, opaque, over a dimmed backdrop**, scroll-locked, page `inert`. It closes on **Escape, backdrop tap, link tap, browser back/route change**. | Fixes P1/P2 and P8 (the sheet scrolls itself on short landscape screens). The page can no longer bleed through. |
| Public menu content | **Home · Services · Work · Areas · Testimonials · About · Contact**, then one primary **"Book a service"** button. **Drop the Call/WhatsApp buttons from the menu** (the bottom bar already has them). | Adds the conversion path, removes the duplication. |
| Breakpoint | Desktop nav stays at **`md` (768 px)**: measured to fit exactly inside the 20 px side padding at 768. Testimonials/Book stay out of the desktop row (the header already has Call/WhatsApp, and Book is on every page). | No regression for tablets / landscape phones. |
| Tap targets | **≥ 44×44 px** for both toggles and all menu/drawer links (`min-block-size`, not fixed height, per the guide). | WCAG 2.5.8 + comfortable thumb use. |

## 4. Implementation plan

**Branch** `feature/mobile-nav`. Commits authored by the user only (no `Co-Authored-By`,
no Claude PR footer). Two PRs: **A = immediate fix** (both navs), **B = follow-ups**.

### Phase A — immediate fix (one PR)

**A-1 · Shared hook `src/shared/lib/useMenuDismiss.ts`** (used by both navs)
- `useMenuDismiss({ open, onClose, panelRef, toggleRef, lockScroll })`:
  - `keydown` Escape on `document` → `onClose()`.
  - On open, focus the first link in the panel. On close, return focus to the toggle
    (only if focus was inside the panel, so a mouse click elsewhere isn't hijacked).
  - `lockScroll` → `document.documentElement.style.overflow = 'hidden'` while open, and
    restore the previous value.
  - Sets `inert` on `#main` and `footer` while open (`inert` is Baseline widely
    available). The header stays interactive so ☰ can close.
- Tests (`useMenuDismiss.test.tsx`): Escape closes, focus moves in and back, scroll lock
  is applied and restored, `inert` is set and cleared, listeners are removed on unmount.

**A-2 · Admin header (`AdminShell.tsx`, `AdminBrand.tsx`)**
- Header row: `min-w-0` on the brand and `whitespace-nowrap` on every right-side item.
  The right-side cluster (`View site`, `ThemeSwitcher`, name/role, `Sign out`) becomes
  `hidden sm:flex`.
- `AdminBrand`: the descriptor line shows **"Admin"** below `md`, and "Motor Services ·
  Admin" from `md` (so it never wraps). "Platinum" stays.
- ☰ button: `min-h-11 min-w-11` (44 px), `aria-label="Menu"`, `aria-expanded`,
  `aria-controls="admin-drawer"`.
- **Drawer account section** (`sm:hidden`, pinned to the bottom of the `<aside>`): name +
  role, `View site ↗`, `ThemeSwitcher` (full labels), `Sign out` (full width, 44 px).
- Drawer: `id="admin-drawer"`, links `min-h-12`, and `useMenuDismiss` with
  `lockScroll` only when `innerWidth < 768`, so the desktop rail is never locked or
  inerted. Bottom padding `pb-[max(1rem,env(safe-area-inset-bottom))]`.
- Tests (`AdminShell.test.tsx`): below `sm` the header shows only ☰ + brand. The drawer
  holds Sign out / View site / theme. Escape closes. `aria-controls` is wired. Staff see
  Jobs + Schedule + the account section.

**A-3 · Public nav (`Nav.tsx`)**
- Toggle: `min-h-11 min-w-11`, `aria-label="Menu"`, `aria-controls="site-menu"`.
- Panel → **fixed sheet** `top: var(--header-h)` to `bottom: 0` (the header height is
  measured once into a CSS variable). It has an opaque `--color-ground` background, its
  own scroll (`overflow-y: auto; overscroll-behavior: contain`), and sits on a sibling
  **backdrop** `button[aria-label="Close menu"]` that is dimmed and closes on tap. The
  existing GSAP enter/exit stays, and still respects reduced motion.
- Links: Home, Services, Work, Areas, Testimonials, About, Contact. Each is `min-h-12`,
  full-width, with a visible **current-page** style (amber left rule + `confirm-text`
  colour, reusing the desktop tokens). Then **"Book a service"** as the primary button.
  The `CallWhatsApp` block is removed from the sheet.
- `useMenuDismiss` with `lockScroll`. **Close on route change** via `useLocation()`
  (covers browser back, not just link taps).
- After a route change: move focus to `<main id="main">` (`tabIndex={-1}`), so the new
  page is where keyboard and screen-reader users land (fixes P3). Only after in-app
  navigation, never on first load.
- `MobileContactBar` stays visible while the menu is open (it is the call/WhatsApp path)
  and sits above the backdrop (`z-50`).
- Tests (`Nav.test.tsx`): the menu lists the 7 links + Book; the current page has
  `aria-current` and the active class. Escape / backdrop / route change close it, focus
  goes to the first link and back to the toggle, and the toggle exposes
  `aria-expanded`/`aria-controls`.

**A-4 · Repeatable mobile check `scripts/check-mobile-nav.mjs`** (dev-only, not in
`npm run build`)
- The exploration script from §1, cleaned up. `playwright-core` becomes a
  **devDependency** and drives the **system Edge/Chrome** (no browser download). It runs
  against `npm run preview` or a URL: `node scripts/check-mobile-nav.mjs [base]`.
- **Asserts**, for 320 / 360 / 390 / 430 / 667×375 / 768 / 1024:
  - no horizontal overflow (`innerWidth === viewport`) on the public pages and the
    mocked admin
  - toggles and menu links ≥ 44 px
  - Escape and backdrop close; scroll locked while open; focus moves in and back
  - nothing clipped in either header
- It writes screenshots to `tmp/mobile-nav/` (git-ignored) for a visual pass.
- `npm run check:mobile` script entry. Document it in README → Scripts.

**A-5 · Verify**
- `typecheck`, `lint`, `test`, `build`, then `npm run check:mobile` against `preview`.
- Screenshots at 320 / 390 / 667×375 / 768, light and dark, for both navs, attached to
  the PR.
- Owner, on real phones after merge: PMS Admin on Android and iPhone at the usual zoom.
  The header fits, and Sign out is in the drawer. Public menu: Book is reachable and the
  page doesn't scroll behind.

### Phase B — follow-ups (separate PR, after A is accepted)

| # | Item |
|---|---|
| B-1 | **Swipe-to-close admin drawer** using the guide's pattern (`popover="manual"` top layer, scroll-snap open/closed stops, `IntersectionObserver` for state, `inert`). Fallbacks for no `animation-timeline` (JS backdrop opacity) and no `scroll-initial-target` (jump-scroll before opening). |
| B-2 | **Staff bottom tab bar** (Jobs · Schedule · Account), replacing the drawer for staff on phones. |
| B-3 | Footer tap targets ≥ 44 px on phones (O1). |
| B-4 | Fix the 768 px section-label overlap on Home (O2). |
| B-5 | `env(safe-area-inset-bottom)` on the bottom contact bar (O3). |

## 5. Risks

- **`inert` / scroll lock leaking.** Every path that closes the menu goes through the
  hook's cleanup, and the tests assert the restore. The desktop rail is excluded by
  width.
- **iOS scroll lock:** `overflow: hidden` on `<html>` is honoured by iOS Safari 16+.
  Older iOS falls back to "page can scroll behind": no worse than today.
- **Focus after navigation** must not steal focus on first load or on hash links. That is
  covered by a test.
- **Admin desktop is unchanged** from `md` up (icon rail + full header). The tests and the
  1024 px check guard it.

## 6. Phase A — as built (2026-10-20)

| Plan | Built | Why |
| --- | --- | --- |
| A-1 `useMenuDismiss` with `restoreFocus` | `focusOnClose()` returns the element to focus, decided **after** `inert` is lifted | The new page's `<main>` is inert at the moment the route changes, so focusing it then fails; closing first, then focusing, works. |
| A-1 `el.inert = true` | `setAttribute('inert', '')` | Same effect in browsers; also testable in jsdom (no `inert` property there). |
| — | New `useFocusOnNavigate` (public `<main id="main">`, admin `<main id="admin-main">`) and `useMediaQuery` | P3 applies to every in-app navigation, not only the menu. |
| A-2 drawer account section | Adds `ThemeSwitcher stacked` (label above three equal buttons) | The inline picker was wider than the 240 px drawer ("Dark" clipped); caught visually, now also asserted by `check:mobile`. |
| A-2 | The closed mobile drawer is `inert` | Its off-screen links were still in the Tab order. |
| A-2 | Header name/role shows from `lg` (was `sm`) | Between 640 and 1023 px it pushed the header past the edge. |
| A-3 GSAP entry | Opacity only on the way in (was `autoAlpha`) | `visibility: hidden` during the tween dropped the focus just moved into the menu; found by `check:mobile` in a real browser, not by jsdom. |
| A-3 | Tapping the current page's link closes the menu too | No route change happens, so the route-change close alone would leave it open. |
| A-3 | The sheet closes if the window widens past 768 px | Otherwise the page would stay locked behind a hidden sheet. |
| A-4 | `check:mobile` runs 129 checks (public at 7 sizes; admin owner at 7 + staff at 320); a thrown step is a failure, not a crash | Repeatable before each mobile-facing PR. |
| Docs | README "Scripts" row and owner-guide phone note **deferred** until PR #26 (docs refresh) merges | #26 rewrites both files; editing them here would conflict. |

**Verification:** `tsc`, `eslint`, `vitest` (281 passed, 22 new across `useMenuDismiss`, `AdminShell`, `Nav`), `npm run build`, `npm run check:mobile` against `preview` — 129/129. Dark mode checked visually at 390 px.
