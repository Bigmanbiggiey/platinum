# Mobile Phase B + navigation fixes — Findings & Plan

**Approved 2026-10-20** (owner: "phase B approved", plus five fixes). Follows
`2026-10-20-mobile-nav.md` (Phase A, PRs #27/#28).

## 1. Findings (live site, Edge + Playwright, admin data mocked in the test browser)

| # | Area | Finding | Evidence |
|---|---|---|---|
| F1 | Public + admin | **New pages open mid-page.** Nothing resets scroll on navigation: neither `ScrollRestoration` (public data router) nor an equivalent in the admin (`BrowserRouter`). | Home scrolled to 3952 → footer "Services" → Services opened at **scrollY 1432**. |
| F2 | Public + admin | **In-site back links push a new history entry**, so the phone's Back then returns to the page just left ("undo"). Admin: `← All requests`, `← All jobs`, `← Clients`, `← Content`, `← Back` (new job / walk-in). Public: the "Services" / "Work" breadcrumb on detail pages. | Service page → "Services" breadcrumb → phone Back → **back on the service page**. |
| F3 | Admin Requests | **The column header renders below the first row and covers it.** `thead` is `sticky top-16` inside an `overflow-x-auto` wrapper, which becomes its scroll container, so it sticks 64 px down *inside the table*. On phones the 6-column table also scrolls sideways. | `thead` top 369 px vs first row 336 px (390 px wide); same at 768 and 1280. |
| F4 | Admin Content → Services / Portfolio | **Rows don't fit phones.** Badge + title + `/slug` + category + `#order` on one non-wrapping line. The page lays out **418 px** wide at 360/390 (Portfolio 412), so the phone zooms out; titles break across 4–5 lines. | Screenshots at 390. The edit pages and content hub already fit. |
| F5 | Public Home, 768–1023 px | The fixed "01 / 05 · INTRO" readout has no background, so headings scroll under it (Phase B item O2). | Screenshot at 768. |

## 2. Plan

**Branch** `feature/mobile-phase-b`. Commits authored by the user only.

1. **Scroll to top on navigation (F1).**
   - Public: `<ScrollRestoration />` in `PublicLayout` (top on new pages, previous position on Back/Forward).
   - Admin: `useScrollOnNavigate()`: top on PUSH/REPLACE; on POP it restores the position saved for that history entry (sessionStorage, keyed by location key).
2. **In-site back = the phone's Back (F2).** `useNavTrail()` records which page each history entry came from (sessionStorage). `<BackLink to>`: if the previous entry *is* `to`, it goes back one step (`navigate(-1)`, which also restores scroll and filters). Otherwise it *replaces* the current entry with `to`, so the phone's Back never returns to the page just left. Used by every admin back link and the public breadcrumb parent links.
3. **Requests page (F3).** Phones (< 768 px): one card per request, with name and status on top, then type · area, date and phone; the whole card is the link. From 768 px: the table, with a working sticky header (no overflow wrapper) and the whole row clickable.
4. **Services / Portfolio lists (F4).** Each row is a two-line block: the title (wraps) with the live/draft pill on the right, then a meta line (`/slug` · category · `#order`, wrapping). "New … title" is one row: the input fills the width and Create sits beside it.
5. **Phase B.**
   - B-1 Swipe-to-close admin drawer (phones): the drawer follows the finger and closes past 30 % of its width or on a quick flick.
   - B-2 Staff bottom tab bar on phones: Jobs · Schedule · Account (Account opens the drawer at its account section). Staff don't see ☰ on phones.
   - B-3 Footer links ≥ 44 px tall on phones.
   - B-4 Readout (F5): a solid chip, shown from 1024 px.
   - B-5 `env(safe-area-inset-bottom)` on the public contact bar and the staff tab bar.
6. **`check:mobile`** gains: scroll-to-top after navigating, in-site back then phone Back, Requests layout, Services/Portfolio rows, and the staff tab bar.

## 3. Deviation from the guide (recorded for review)

`navigation-drawer` prefers a `popover` + scroll-snap drawer. Here the `<aside>` is
both the desktop icon rail and the phone drawer, so B-1 uses a touch gesture on the
existing drawer instead (`touch-action: pan-y`, with the transform following the
finger). Rebuilding it as a popover would split the rail from the drawer, which is a larger change
than this fix needs.

## 4. As built (2026-10-20)

| Plan | Built | Why |
| --- | --- | --- |
| `navTrail` with `<BackLink>` in one module | `navTrail.ts` (hooks) + `BackLink.tsx` (component) | React fast refresh wants component files to export only components. |
| — | `Badge` no longer shrinks or wraps (`shrink-0 whitespace-nowrap`) | "LIVE"/"DRAFT" pills were squeezed by long titles. |
| — | `rls.test.ts` timeouts raised to 20 s | Its live Supabase calls failed at the 5 s default under the full parallel run (5 007–5 023 ms), not because of a policy. |
| Nav tests on a data router | `MemoryRouter` with `ScrollRestoration` stubbed | jsdom's `AbortSignal` isn't the one Node's `fetch` accepts, so a data router can't navigate in jsdom. Scrolling is covered in a real browser by `check:mobile`. |
| — | `window.scrollTo` is a no-op in `vitest.setup.ts` | jsdom only logs "Not implemented". |

**Verification:** `tsc`, `eslint`, `vitest` (295 passed, 10 new), `npm run build`,
`npm run check:mobile` against `preview`: **205/205** (public 7 sizes; admin owner 7 +
staff; admin pages at 360/390/768/1280; public navigation; staff tabs).
