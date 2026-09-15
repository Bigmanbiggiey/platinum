# Design refresh plan — toward an Awwards-level public site

Status: **APPROVED (2026-09-15) — Discovery/Documentation phase complete. Proceeding to
Implementation.** No code changed by this document itself; see the execution plan for
the implementation sequence.
Scope: the public site only (`src/public/**`). Admin (`src/admin/**`) is a working tool,
not a showcase — out of scope here unless noted.
See [[project-overview]] / `docs/product-definition.md` §10 for the Rev 01 brand pack
this builds on, and the phase-gate rule this plan is deliberately staying inside of.

> **Revision 2** — incorporates critique feedback on the original draft: split the
> radius token between structural and interactive elements (§4), added a non-color
> cue for the confirm/action accent split (§4), tied the two title-strip header
> treatments together explicitly (§6), and added a conversion check alongside the
> visual one in verification (§11). Changes from Rev 1 are marked inline with **[Rev 2]**.
>
> **Revision 3** — owner approved Rev 2 on 2026-09-15 on condition the conversion
> check in §11 move to a post-launch comparison (no real traffic or working CTA
> analytics exist pre-Go-Live). Marked inline with **[Rev 3]**.

## 1. Where we actually are

I read the live components, not just the tokens. The Rev 01 palette and type stack
(`src/index.css`) are wired in correctly and are genuinely distinctive — Graphite /
Signal Amber / Instrument Teal is not a template palette. But the pages built on top
of it (`HomePage.tsx`, `Section.tsx`, `cards.tsx`, `Footer.tsx`) are generic MVP
scaffolding:

- **Every** section — Home, Services, Portfolio, About, Contact, Service Areas —
  opens with the same tracked-out, uppercase, `font-mono` "eyebrow" label. It's
  decorative, not informational, and it's the single most common tell of a
  generated page.
- Service / Project / Testimonial / Partner cards are the identical kit: `rounded-lg
  border border-line p-5`, same hover-to-signal-border, no other differentiation.
- The Home hero is plain stacked text — no image, no graphic, no motion, nothing that
  is specific to *this* business.
- **Instrument Teal is defined in `@theme` and never used anywhere in the app.** One
  of the four brand colors is dead weight.
- Mono type (IBM Plex Mono) is reserved, per the brand pack itself
  (`product-definition.md` §10.2: *"descriptor line, labels, all technical data —
  reg numbers, codes, readings"*), for actual technical data — but in the build it's
  only ever used for decorative section labels, never for real data.

**The finding that matters: the identity is good, the execution of it is generic.**
This plan is not a rebrand. It's making the site actually use the system it already
has, and use it for a reason tied to what this business is.

## 2. The idea

"Platinum **Point**" is a literal, useful concept: a fixed point of competence that
comes to wherever the vehicle is. The existing (unapproved-as-final but already live)
Wordmark mark is a crosshair/compass with an amber node — a datum point. That's the
whole design language, already sitting there unused:

- **Amber (Signal) = the point.** A location, a contact action, a highlighted spec.
  It marks *one* thing per view, never decorates.
- **Teal (Instrument) = confirmed / in progress.** Status, active nav state, focus
  rings, "booking confirmed" states. Gives the second brand color an actual job for
  the first time.
- **Mono = real data, never decoration.** Job reference numbers, vehicle
  make/model/year, dates, coordinates, spec fields. If a mono label isn't standing in
  for real structured data, it's set in Archivo instead.
- **Structural marks over decoration.** Crosshair/datum motifs, spec-plate /
  work-order framing for content that genuinely has that shape (a completed job *is*
  a job record: vehicle, date, outcome). Content that isn't a record (a service
  description, an About paragraph) doesn't get dressed as one.

This gives every page a reason for its treatment instead of one reusable card kit
applied everywhere by default.

## 3. Self-critique against the generic-AI-page checklist

Checked the plan against the common tells before going further:

- Warm cream + serif + terracotta — no, this is Rev 01's own palette, kept as-is.
- Near-black + single neon accent — no, two functional accents (amber + teal), light
  ground by default.
- Broadsheet hairlines / zero-radius newspaper columns — avoided; see §5, radius is
  tightened but not to zero, and layout isn't columnar.
- SaaS card kit (identical rounded corners, same grey shadow, gradient wash) — this
  is exactly what exists today and is being explicitly removed (§6).
- Tracked-out ALL-CAPS eyebrow above every heading — exists today, being removed
  everywhere it isn't real data (§4, §6).
- "Word — fragment" labels, middle-dot meta strings, `→` on every link — the
  "Learn more →" pattern on ServiceCard and the `·` joins in Footer/testimonials are
  minor instances of this; flattened in §6.
- **[Rev 2]** Two accent colors carrying meaning by hue alone (a common accessibility
  miss dressed up as a design system) — flagged and closed in §4: the confirm/action
  split gets a non-color cue, not just teal-vs-amber.

## 4. Token-level changes (the only things touching `index.css` / `@theme`)

Three small, justified evolutions — flagged for your sign-off, everything else in
this plan is pure layout/component work inside the existing tokens:

| Change | What | Why |
|---|---|---|
| Activate `--color-teal` | Give Instrument Teal a real semantic role: `--color-confirm` (status/active-state), distinct from `--color-accent` (amber) | It's already an approved brand color sitting unused; one accent color for every purpose (CTA *and* nav state *and* status) is what makes the site read as flat |
| Split the radius token **[Rev 2 — revised]** | `--radius-structural: 2px` for cards, spec plates, and containers (unchanged from Rev 1); a **separate** `--radius-button: 6px` for `Button`/`ButtonLink`/`ButtonAnchor` and all form inputs | A single near-square radius is right for spec plates and cards (reads as machined/engineering) but is the wrong call on a large tappable CTA on a phone screen — this is still a service business a stressed customer needs to feel invited to contact, not a dashboard. Splitting the token lets structural rigor and interactive approachability both be true. **Confirm the 6px figure by testing the primary CTA at actual mobile size before finalizing** — the number matters less than not inheriting it from the instrumentation logic by default. |
| Non-color cue for confirm/action **[Rev 2 — new]** | Wherever `--color-confirm` (teal) and `--color-accent` (amber) appear as *state* indicators rather than plain decoration — nav active state, booking status, focus rings — pair the color with a shape or label difference (an icon, a filled-vs-outline treatment, or adjacent text), never color alone | Two accent hues that only differ in hue are indistinguishable to colorblind users trying to tell "this is confirmed" from "this is actionable." This is a one-line rule to carry into `Section 6` component work, not a new token — no new hex values needed to satisfy it. |

No new hex values, no new typefaces, no change to Archivo/Plex Mono/Newsreader roles.
Newsreader stays monogram-only per the brand pack rule — that's a specific
constraint, not a generic default, so it's kept exactly as specified.

## 5. Layout system

- **Alignment:** left-aligned content, not centered. An engineering drawing has a
  title block pinned to a corner, not a centered hero. Headlines, intros, and body
  copy all sit against a consistent left edge; only the primary/secondary CTA pair
  and small standalone marks (the datum crosshair) break that edge deliberately.
- **Two-column "sheet" pattern for detail pages** (Service detail, Portfolio detail)
  on desktop: main content left (≤65ch measure), a narrow right-hand data rail
  holding real structured facts — vehicle/job info, spec fields, service category,
  CTA — styled as a spec plate. Stacks to a single column under `md`.

  ```
  ┌─────────────────────────────┬──────────────┐
  │ Services / Diagnostics          (crumb)     │
  │ Full diagnostic scan             (h1)       │
  │ lede paragraph, ≤65ch                       │  ┌ SPEC ────────┐
  │                                              │  │ CATEGORY     │
  │ body copy, FAQs...                          │  │ Diagnostics  │
  │                                              │  │ FROM         │
  │                                              │  │ quote-based  │
  │                                              │  └──────────────┘
  │                                              │  [Book] [Ask]  │
  └─────────────────────────────┴──────────────┘
  ```

- **List pages** (Services, Portfolio, Service Areas) keep a grid, but the *card*
  changes per §6 — the grid itself isn't the problem, the identical tile is.
- **One hero treatment, Home only.** Every other page keeps a compact, left-aligned
  title strip (crumb + h1 + one-line sub) — consistent, quiet, not competing with
  Home. This is already close to what `ServiceDetailPage`/`PortfolioDetailPage` do;
  it's kept, just restyled.

## 6. Component-by-component changes

**`Section.tsx`** — drop the universal eyebrow-label pattern. Replace with three
distinct header treatments used situationally, not as one default:
1. Plain heading, no label (About, Contact, Service Areas, Testimonials) — the page
   context already tells you what it is; a label above it is redundant.
2. A real mono **data strip** where the content is a record: on the Home services/
   portfolio sections, the count and a coordinate-style reference (e.g.
   `04 SERVICES · KITENGELA` derived from real data, not a static string) — only
   where numbering is true and meaningful, not decorative.
3. No header at all for the closing CTA sections — the CTA text stands alone.

   **[Rev 2]** Treatments 1 and 2 both sit inside the same left-aligned title-strip
   layout from §5 — same crumb position, same heading scale, same vertical rhythm.
   The *presence* of the mono data strip is the only variable. That's what keeps the
   difference reading as deliberate restraint (some pages have a real record to show,
   some don't) rather than as an inconsistent build — worth a shared `TitleStrip`
   sub-component so treatments 1 and 2 can't drift apart in spacing/scale over time.

**`cards.tsx`:**
- `ServiceCard` → compact record row, not a bordered tile: category set in mono as a
  real field label (`CATEGORY` : value), title in Archivo 700, summary truncated,
  "Learn more →" replaced with a plain title-as-link (the arrow-suffix is a template
  tell; the whole row already reads as clickable).
- `ProjectCard` → keeps the image (it's earned — real photo + real vehicle data) but
  the caption becomes an actual spec strip: `VEHICLE`, `YEAR` as mono field/value
  pairs instead of a single dotted mono line, amber node marking "completed" —
  **[Rev 2]** paired with the word "Completed" or a check-mark glyph next to the node,
  not the amber dot alone, per the §4 non-color-cue rule.
- `TestimonialCard` → drop the border-box-with-stars-inside default; set the quote
  larger (it's the actual content), attribution small underneath, star rating as a
  quiet inline mark rather than a repeated row of glyphs at the top of every card.
- `PartnerItem` → stays simple; it's already minimal and doesn't need dressing up.

**`Button` / `ButtonLink` / `ButtonAnchor`** — apply `--radius-button` (see §4, not
`--radius-structural`); keep the primary/accent/outline role split (it's sound —
inverted-ground primary, amber accent, outline tertiary). No new variants needed.

**`Wordmark.tsx`** — this is the strongest existing asset (crosshair + amber node).
Reuse it as a recurring graphic motif at hero/section-transition points instead of
being confined to the header, so the datum-point idea shows up more than once.

**Nav / Footer** — Footer's `Hours` / `Site` mono labels are minimal utility labels
in a footer, which is an accepted convention (not a "decorative eyebrow"); left as
is. Nav active-state underline/color moves from amber to the new `--color-confirm`
(teal), reserving amber for calls to action only, so the two accents stop competing.
**[Rev 2]** Pair the active-state underline with the nav item's own label being
already visible (it is) rather than color shift alone — since the underline is a
positional cue as well as a color one, this satisfies §4's non-color-cue rule without
extra work; no additional treatment needed here beyond the color swap.

## 7. Home page, specifically

Current hero is plain text. Replacement, still fully content-driven (no fake stock
imagery, no placeholder photo of a generic mechanic):

- Left-aligned h1 using the real hero heading from CMS, set at a bigger, more
  committed scale/weight (Archivo 800) than today's 4xl/5xl — full-weight
  commitment to the headline as a design element, not a neutral label.
  Line length ≤ 80ch (currently `max-w-3xl` — recheck against 800-weight metrics).
- To the right of the headline on desktop (stacks below on mobile): a single large
  rendering of the crosshair/datum mark — the one orchestrated motion moment for the
  whole site — crosshair lines draw in, amber node settles/pulses once on load, then
  stops. `prefers-reduced-motion` shows it fully resolved, no animation.
- The two CTAs (Call/WhatsApp, Request a Service) stay exactly where they are
  functionally — this is the highest-value real estate on the page and shouldn't be
  sacrificed for aesthetics — just restyled per §6 (button radius per the revised §4
  token, not the structural one).
- Services / Recent work / Testimonials sections keep their current data and order;
  only the Section header treatment and card styling change (§6).

## 8. Forms (Book, Request Service, Request Inspection, Contact)

Not visually reworked beyond token/component inheritance (button/input radius per
the revised §4 split, focus rings in teal paired with the existing focus outline
shape — not a color change alone). Functional forms are not where Awwards judges
look, and `EnquiryForm` already has honeypot/timing anti-spam wired to Turnstile —
not worth destabilizing before Go-Live. Revisit after Phase 2 Part C if there's
appetite.

## 9. Explicitly not changing

- Copy/content in the database (owner-owned via CMS) — this plan only touches
  structural/UI copy (labels, empty states), never the actual service/testimonial/
  about text.
- Information architecture, routes, or the admin app.
- The Rev 01 hex values, font families, or the "Automotive Engineering" descriptor
  lockup.
- Anti-spam / auth / RLS / data model — zero touches outside `src/public/**` and
  `src/index.css` tokens.

## 10. Dependencies / open blockers

- **Real photography** (`product-definition.md` §10.4: "will be found" — not yet
  supplied). The plan above doesn't depend on it (the datum-mark motif carries the
  hero), but Portfolio cards/detail pages are already image-led and get materially
  stronger once real job photos exist. Not a blocker to start.
- **Production `ppae-*.svg` masters** (§10.4) — current `Wordmark.tsx` is
  explicitly an interim hand-drawn stand-in. Reusing it as a recurring motif (§6) is
  fine short-term but should be swapped for the real master once produced, so scope
  the motif work to be a drop-in SVG swap, not hand-coded paths duplicated in
  multiple places.
- **Tagline** — still undecided (§10.3 open question #24 in product-definition.md).
  Not required for this plan; hero uses the existing CMS heading/sub blocks.

## 11. Rollout, respecting the phase-gate

This document is Discovery/Documentation only — nothing here is built. Proposed
sequence once you've reviewed it:

1. **Review this plan** — flag anything you want changed, especially §4 (the three
   token changes) since those are the only things touching brand-adjacent values.
2. **Approval** to proceed.
3. **Implementation**, staged for lower risk even though the plan covers every page:
   a. Token changes (§4) + `Section`/card/`Button` component changes (§6) — these
      changes ripple everywhere because those components are shared, but they're
      mechanical and low-risk.
   b. Home hero (§7) — the one bespoke, higher-effort piece.
   c. Remaining pages inherit the component changes from (a) automatically; spot-
      check each on staging.
4. **Testing** — existing Vitest/RTL suite plus a manual pass on mobile widths
   (≤400px per the responsive floor), `prefers-reduced-motion`, and a contrast pass
   on the new `--color-confirm` teal against its backgrounds (WCAG AA) given it's
   newly carrying semantic weight it didn't have before.
5. **Verification** before calling this redesign done pre-Go-Live:
   - **Visual**: screenshot review against this plan on `platinum-point.vercel.app`
     staging.
   - **[Rev 3 — moved] Conversion — deferred to post-launch, not a pre-Go-Live gate**:
     there's no real production traffic yet (site is noindexed, pre-Go-Live) and
     `trackCta()` events are no-ops until `VITE_CF_ANALYTICS_TOKEN` is set (itself an
     open Go-Live item, `docs/phase-2-remaining.md`) — so a pre/post comparison can't
     run now. Once CF Analytics is wired and the site is public, capture CTA
     click-through / booking-start rate for a baseline period post-launch and watch it
     over the following weeks. The goal of this plan is distinctiveness, but the
     site's job is bookings and calls — a version that looks more "Awwards" but
     measurably suppresses CTA engagement is a regression, not a win, even if that
     read-out only becomes possible after Go-Live. Track this as a WP14 Part C
     follow-up, not a blocker on this redesign shipping.

No code has been written or changed as part of producing this plan.
