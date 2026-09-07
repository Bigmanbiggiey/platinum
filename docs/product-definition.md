# Platinum Point Automotive Engineering — Product Definition

> **Status:** Phase 0 (Discovery) — DRAFT for review
> **Last updated:** 2026-09-07 (rev. 2 — incorporates owner's answers to §14)
> **Owner of this document:** Lead architect (TECHBIGGIEY)
> **Approval required before Phase 1.** Silence is not approval.

---

## 0. How to read this document

This is the discovery baseline for Platinum Point Automotive Engineering. It defines
*what* we are building and *why*, the boundaries of the MVP, and the questions still
open with the business owner. It deliberately does **not** contain implementation
detail, schema, migrations, or infrastructure. Those belong to later,
separately-approved phases.

Where a statement depends on information we do not yet have, it is marked
**(UNCONFIRMED)** and also listed in [Section 14 — Open questions](#14-open-questions).
We do not invent answers.

> **Naming note:** the project was kicked off internally as *"Platinum Motor
> Services"*. The owner has since confirmed the real trading name is **Platinum Point
> Automotive Engineering**. All public-facing and documentation references now use the
> real name. The working directory / repo folder remains `PLATINUM` (harmless
> codename) unless you ask to rename it. Whether a registered limited company
> ("… Engineering Limited") exists is still open — see §14.

### 0.1 Confirmed business facts (from owner, 2026-09-07)

| Fact | Value |
| --- | --- |
| Trading name | **Platinum Point Automotive Engineering** |
| Owner | **Mr. Paul Ndirangu Gatama** (may be featured publicly on the About page) |
| Primary phone | **+254 722 322870** (Paul) — *WhatsApp on the same number assumed; to confirm* |
| Public email | **gatama98p@gmail.com** — *personal Gmail; a branded address (e.g. `info@`domain) recommended later* |
| Base location | Operates near **Shell Kitengela Service Station**, Yukos area, Kitengela ("JAJEMELO YUKOS"). Service-area business — approximate area shown, not necessarily a precise pin. |
| Google Business Profile | **Exists** (owner shared a GBP link). Still need: opening hours as text, management access, and confirmation that category/phone/address on the listing match what we publish. |
| Opening hours | **On the GBP; not yet provided as text** — see §14. |
| Referencing "DT Dobie" | **Permitted** in public copy. |
| Service areas | **Kitengela and its environs** as the core area; **available anywhere in Kenya by arrangement where transport costs are facilitated.** |
| Engineering (press & lathe) | **In scope for this site.** Treated as first-class services and as lead generators (lathe work → brake jobs; press work → suspension / bushing jobs). |
| Pricing | **Quote-based** ("every vehicle is different"). No fixed price list. A CMS-editable pricing/quotes explainer block; quote requests flow through the booking / service-request path. |
| Bodywork & garage affiliates | **Name a few** trusted partner body shops / garages. They have **no websites** — name + short note only, admin-managed. |
| Online booking & scheduling | **Owner specifically wants it.** Phased approach proposed — see §5.3 and `decisions.md` **ADR-0013**. |
| Testimonials | **Customers submit from the site** (moderated). Public display shows **first name + vehicle type only**, e.g. *"Biggiey, Mercedes-Benz G-Wagon"*. |
| Language | **English-primary** (the formal language). Incidental **Swahili** phrasing acceptable where it helps. No i18n framework in MVP. |
| Branding | Some branding exists; **strong appetite** for brand work. Asset request list in §10.4 — owner will supply. |
| Content | Owner **can provide** service descriptions, past jobs, About content. Photos "will be found" over time. |

---

## 1. Product vision

**Platinum Point Automotive Engineering is a mobile-first automotive service business in Kitengela,
Kenya, run by a former DT Dobie engineer.** The product we are building is the
business's professional digital presence and its operational backbone.

In one sentence:

> *A trustworthy online front door for an expert mobile mechanic — plus a lightweight
> system behind it that turns website enquiries into managed customers, vehicles and
> jobs.*

### What it is becoming

| Horizon | What the product is |
| --- | --- |
| **Now (MVP)** | A credible public website that makes the business discoverable and easy to contact, backed by a simple admin area where the owner manages site content and a basic client / vehicle / service-request CRM. |
| **Next (Post-MVP)** | A working service-management tool: service history per vehicle, job tracking, structured inspection reports, quotes and invoices, maintenance reminders. |
| **Later (Future)** | A repeatable platform other independent mechanics and small garages can adopt — the TECHBIGGIEY case study becomes a product. |

### Positioning

- The **mobile mechanic model is the offer, not an apology.** The site should frame
  "we come to you" as a deliberate, convenient, professional service — not a stopgap
  until another workshop is found.
- Trust is built on **verifiable expertise** (DT Dobie background, breadth across
  vehicle types, engineering / press / lathe capability) rather than on a large
  facility or a fleet of branded vans.
- The business also **coordinates** work it does not do in-house (bodywork via trusted
  affiliates). The site should present a *single accountable point of contact* for a
  range of automotive needs.

### Guiding principles for the build

1. **One dataset, two faces.** The public website and the admin system read and write
   the same data. Admin publishes a service → it appears on the site. Admin uploads a
   job → it can appear in the portfolio. Admin approves a testimonial → it can appear
   publicly. (See [Section 11](#11-data-model-requirements) and
   `decisions.md` ADR-0004.)
2. **Incremental and phase-gated.** Nothing is built before its phase is approved.
3. **Right-sized.** Simple, maintainable solutions appropriate to a small Kenyan
   automotive business. No speculative abstractions.
4. **Content grows over time.** The absence of professional photography today must not
   block launch; the admin system is designed for continuous content addition.
5. **Owner-operable.** The owner can manage website content and the CRM without a
   developer.

---

## 2. Business objectives

The system exists to support concrete business outcomes, not to be a website for its
own sake.

| # | Business objective | What the system must do | How we'll know it's working |
| --- | --- | --- | --- |
| BO-1 | **Be found online** by people searching for mechanics / inspections near Kitengela. | Fast, indexable, locally-optimised public site; structured data; sitemap; Google Search Console + Google Business Profile alignment. | Impressions/clicks in Search Console; ranking for target local terms; site appears for brand searches. |
| BO-2 | **Convert visitors into enquiries.** | Multiple, low-friction contact paths: click-to-call, WhatsApp deep link, service-request form, inspection-request form, contact form. | Number of enquiries received via each channel per month. |
| BO-3 | **Build trust** in the owner's expertise before first contact. | About / credentials content, services explained in plain language, portfolio of real work, moderated testimonials, clear service areas. | Qualitative: enquiries mention the site; lower "are you legit?" friction. |
| BO-4 | **Make the mobile model look intentional.** | Design, copy and IA that treat "we come to you" as the product. | Owner feedback; enquiry quality. |
| BO-5 | **Reduce admin friction** for the owner. | Enquiries land in one place; convert an enquiry into a client + vehicle in a couple of clicks; see what needs follow-up. | Owner can run the day from the dashboard; fewer lost leads. |
| BO-6 | **Let the owner run content himself.** | CMS for services, portfolio, testimonials, key page copy, business info — no code, no redeploy. | Owner makes a content change unaided. |
| BO-7 | **Create a foundation that can grow** into service management without a rewrite. | Clean conceptual data model; entities named now that later phases extend (service records, jobs, inspections, quotes, invoices). | Post-MVP phases add tables/features without reworking core entities. |
| BO-8 | **Serve as a TECHBIGGIEY case study.** | Production-quality engineering, documentation, tests, accessibility, performance. | Other mechanics/businesses see it and ask for something similar. |

---

## 3. Target users

### 3.1 External users (public website)

| User | Context | Primary needs | Notes |
| --- | --- | --- | --- |
| **Prospective customer (first-time)** | Car has a problem or needs a service; searching online or given the link by a friend. On a phone, possibly on mobile data, possibly in a hurry. | Understand what the business does; decide if it's trustworthy; contact fast (call / WhatsApp / form). | Largest group. Mobile-first, low-bandwidth-friendly design is mandatory. |
| **Returning customer** | Has used the business before; comes back via WhatsApp/phone, sometimes via the site. | Reach the owner quickly; maybe reference past work. | Public site's job is mainly to be a fast contact shortcut. Their history lives in the admin CRM, not a public login (no customer portal in MVP). |
| **Vehicle buyer needing an inspection** | About to buy a used car (often in Nairobi / Kitengela / Kajiado area); wants an independent pre-purchase inspection, often urgently. | A clear "pre-purchase inspection" offer; what's checked; how to request; how fast; how results are delivered. | High-intent, time-sensitive. Dedicated inspection request flow. |
| **Fleet / business customer** | Runs several vehicles (SACCO, small company, NGO, boda/taxi operator, matatu owner). | Confidence the mechanic can handle volume and varied vehicles; a way to start a conversation. | MVP: capture as a client of type "fleet/business" and route to direct contact. No fleet dashboard in MVP. **(UNCONFIRMED whether this is a current customer segment.)** |
| **Referrer / affiliate** | Bodywork shop, parts dealer, another mechanic sending work over. | Quick way to see scope and contact. | No special feature in MVP. |

### 3.2 Internal users (admin platform)

| User | Context | Primary needs | Notes |
| --- | --- | --- | --- |
| **Owner / admin** | The DT-Dobie-trained mechanic. Works mobile, often on-site under a vehicle, limited time, on a phone. | Log in on a phone; see today's enquiries and what needs follow-up; add/edit a client, vehicle, service request; publish a service; upload a job photo and write a short portfolio entry; approve a testimonial; edit a piece of website copy; update business info. | Single admin user at launch. Admin UI must be usable on a phone. |
| **Family member / helper (possible)** | May assist with content or answering enquiries. | Same as owner, possibly limited. | **(UNCONFIRMED.)** Data model should allow more than one admin user and a role field, even though only the owner is seeded. |
| **Developer / maintainer (TECHBIGGIEY)** | Builds and maintains the system. | Clear docs, tests, CI, safe deploys. | Not a product persona, but a real stakeholder for BO-8. |

---

## 4. Customer journeys

Each journey below is written as: **trigger → path → system touchpoints → desired
outcome**. These drive the page and feature list in Sections 5–6.

### 4.1 General mechanical repair (first-time customer)

1. **Trigger:** Car won't start / makes a noise / is due a service. Person searches
   "mechanic near Kitengela" or "mobile mechanic Nairobi", or follows a shared link.
2. **Land:** Home page. Immediately sees: what the business is, that the mechanic comes
   to you, DT Dobie credibility, and call / WhatsApp buttons.
3. **Explore:** Opens **Services**, reads **General Mechanical Repairs** and
   **Diagnostics**. Maybe glances at **Portfolio** and **Testimonials** to sanity-check.
4. **Check coverage:** Opens **Service Areas** to confirm they're covered
   (or reads it on the contact/home section).
5. **Contact:** Chooses one of:
   - **Tap to call** (fastest, high intent).
   - **WhatsApp** deep link with a pre-filled message ("Hi, I found you online, I need…").
   - **Request a Service** form: name, phone, WhatsApp (optional), vehicle
     (make/model/year/reg), location/area, problem description, preferred time.
6. **System:** Form submission creates a **service request** record (status `new`) and
   notifies the owner (email and/or dashboard). Visitor sees a clear confirmation and
   the owner's direct contact details as a fallback.
7. **Follow-up (admin):** Owner opens the dashboard, sees the new request, calls or
   WhatsApps the customer, and in the admin **converts** the request into a
   **client** + **vehicle**, sets status to `contacted` → `scheduled` → `completed`.
8. **Outcome:** Job booked; customer now exists in the CRM with their vehicle recorded,
   ready for future work and (post-MVP) service history.

### 4.2 Pre-purchase / mechanical inspection (vehicle buyer)

1. **Trigger:** Buyer has found a car for sale and wants an independent check before
   paying. Searches "pre-purchase car inspection Nairobi / Kitengela" or "car
   inspection before buying Kenya".
2. **Land:** **Pre-Purchase Inspection** service page (a first-class landing page, SEO
   target). Explains: what is inspected (engine, transmission, suspension, brakes,
   body/chassis, electricals, road test, diagnostics scan), what the buyer receives,
   turnaround, and that it's done wherever the car is.
3. **Request:** **Request an Inspection** form: buyer name + phone/WhatsApp; the car
   (make, model, year, mileage if known); where the car is located; seller contact or
   viewing time; target date; any concerns.
4. **System:** Creates a **service request** of type `pre_purchase_inspection`
   (status `new`), notifies the owner. Confirmation screen sets expectations and shows
   direct contact.
5. **Scheduling / contact:** Owner contacts buyer and seller, agrees a time and place.
   Admin status → `scheduled`.
6. **Inspection:** Owner inspects the vehicle on-site, road tests, runs diagnostics.
7. **Result delivery (MVP):** Owner reports findings to the buyer by call / WhatsApp /
   a written summary sent manually. Admin status → `completed`, with notes stored on
   the request. *(A structured, shareable inspection report is **Post-MVP** — see
   Section 7.)*
8. **Outcome:** Buyer gets an informed decision; a client + vehicle record exists for
   potential future servicing.

### 4.3 Returning customer

1. **Trigger:** Existing customer needs something again (service due, new fault, second
   vehicle, wants a quote).
2. **Path:** Usually **WhatsApp or phone directly** — the site's role is to be the
   fast shortcut (saved link, Google listing, business card). May revisit a service
   page to point the owner at what they want.
3. **System (admin side):** Owner finds the existing **client**, their **vehicle(s)**,
   and past **service requests** / notes in the CRM. Adds a new service request linked
   to the existing client and vehicle.
4. **Outcome:** Faster handling because the customer and vehicle are already on file.
   *(Full service history timeline and a customer-facing login are Post-MVP / Future.)*

### 4.4 Fleet / business customer *(segment UNCONFIRMED)*

1. **Trigger:** Operator with several vehicles wants a reliable mechanic.
2. **Path:** Reads services + about; uses a contact/service-request form and indicates
   "business / fleet"; or calls directly.
3. **System:** Service request captured; owner creates a **client** of type
   `fleet/business` and can attach multiple **vehicles**.
4. **Outcome:** Relationship started and recorded. No fleet-specific dashboard in MVP.

### 4.5 Online booking / scheduling (any customer)

1. **Trigger:** Visitor has decided they want the mechanic and wants to lock in a
   time rather than wait for a call back.
2. **Land:** **Book a Service** page. Chooses a service, describes the vehicle, gives
   the location, and picks a **preferred date and time window** (MVP) — not a
   hard-committed calendar slot (see ADR-0013 for why, and the phased plan).
3. **System:** Creates a `service_request` with `request_type = booking` and the
   requested date/time window; status `new`; owner notified.
4. **Confirmation loop:** Owner reviews in the admin **Schedule** view, confirms or
   proposes a new time; the customer receives a confirmation (email / WhatsApp / SMS —
   channel per ADR-0008). Status → `scheduled`.
5. **Outcome:** A booked, dated job the owner can see on an agenda, with the customer
   and vehicle captured.
6. **Fast-follow (Phase 5):** true self-service slot picking against the owner's
   published availability, with automatic hold, reschedule/cancel links, and reminders.

### 4.6 Testimonial submission (past customer)

1. **Trigger:** A happy customer wants to leave feedback (prompted by the owner after a
   job, or finds the site).
2. **Path:** **Submit a testimonial** form: first name, vehicle (free text, e.g.
   "Mercedes-Benz G-Wagon"), rating (optional), the comment, and consent to publish.
3. **System:** Creates a `testimonial` with `status = pending` via the protected
   submission path (ADR-0006). Owner is notified.
4. **Moderation:** Owner approves / rejects in the admin. On approval it appears
   publicly showing **only first name + vehicle type + the comment** (e.g. *"Biggiey,
   Mercedes-Benz G-Wagon"*).
5. **Outcome:** Growing, genuine social proof with minimal PII exposure.

### 4.7 "Just checking you're real" micro-journey

Applies to all external users: within seconds of landing, a visitor should be able to
confirm the business is legitimate and reachable — real name, real location area, real
phone/WhatsApp, real examples of work, real testimonials. This is a design
requirement, not a page.

---

## 5. Public website requirements

Mobile-first, fast on low bandwidth, accessible (WCAG 2.1 AA target), works without
JavaScript for core content where reasonable (content is server-renderable / static).

### 5.1 Pages (MVP)

| Page | Purpose | Key content | Data source |
| --- | --- | --- | --- |
| **Home** | Orient + convert. | Hero (what we do, "we come to you", credibility line), primary CTAs (call / WhatsApp / request service), services snapshot, why-choose-us (DT Dobie background, breadth, engineering capability), service-area summary, featured portfolio, featured testimonials, contact block. | `services`, `portfolio_projects`, `testimonials`, `site_settings`, `content_blocks` |
| **Services (index)** | Show the full range. | List of published services with short descriptions and icons; grouped by category if useful. | `services` |
| **Service (detail)** | Explain one service; SEO landing page. | Long description, what's included, typical process, FAQs, "get a quote" CTA (pricing is quote-based). One per service, including **Pre-Purchase Inspection**, **Vehicle Diagnostics**, **Mobile Mechanic / General Repairs**, **Preventive Maintenance**, **Vehicle Assessment**, **Road Tests**, **Mechanical Inspections**, **Bodywork (via affiliates)**, and **Engineering / Press & Lathe** (confirmed in scope — cross-linked to related mechanical services, e.g. press → suspension/bushings, lathe → brakes). | `services` |
| **Portfolio (index)** | Prove capability. | Grid of published projects, filterable by category / vehicle type. Works with 1 entry or 50. | `portfolio_projects`, `media` |
| **Portfolio (detail)** | Tell one job's story. | Vehicle, problem, what was done, outcome, before/after images (when available), related service. | `portfolio_projects`, `media` |
| **Testimonials** | Social proof. | Approved testimonials (first name + vehicle type + comment only), featured first. Includes the **Submit a testimonial** form. Graceful when few exist. | `testimonials` |
| **Service Areas** | Set expectations on coverage. | Core area: **Kitengela and its environs**. Plus: **available anywhere in Kenya by arrangement where transport is facilitated.** Owner-managed area list. Map optional. | `service_areas`, `site_settings` |
| **About** | Build trust. | **Mr. Paul Ndirangu Gatama's** background (former **DT Dobie** engineer, experience across many vehicle types), the mobile model as intentional, the engineering/press/lathe capability, values, and a short **named** list of trusted bodywork/garage partners (name + note, no links). | `content_blocks`, `site_settings`, `partners` |
| **Contact** | Every way to reach the business. | Phone (click-to-call), WhatsApp deep link, email, service areas, hours, base area (near Shell Kitengela Service Station, Yukos), contact form, links to Book / Request forms, GBP link, map. | `site_settings`, form → `service_requests` |
| **Book a Service** | Online booking / scheduling (owner-requested). | Service + vehicle + location + **preferred date & time window**; MVP = booking *request* confirmed by the owner (ADR-0013). | form → `service_requests` (`request_type = booking`) |
| **Request a Service** | Structured intake for repairs/diagnostics/maintenance/engineering. | Form (see 5.3). | form → `service_requests` |
| **Request an Inspection** | Structured intake for pre-purchase / mechanical inspection. | Form (see 5.3). | form → `service_requests` |
| **Legal: Privacy Policy** | Compliance + trust; needed because forms collect personal data (Kenya Data Protection Act 2019). | Standard privacy content. **(Content source to be confirmed — see §14.)** | `content_blocks` |
| **404 / error** | Recover gracefully. | Helpful links back. | static |

> Pages that may collapse into sections rather than standalone routes for MVP
> (decision deferred, low risk): Service Areas and About could live partly on the
> Home page. Testimonials could be a Home section plus a full page. This is a design
> call for Phase 2, not an architecture decision.

### 5.2 Global components

- **Header / nav** with prominent Call + WhatsApp actions (sticky on mobile).
- **Footer** with NAP (Name, Address area, Phone), service areas, quick links, hours,
  copyright, link to Privacy Policy.
- **Floating / persistent contact affordance** on mobile (call + WhatsApp).
- **CTA block** (reusable): "Get your car looked at — call, WhatsApp, or request a visit."
- **Service card**, **portfolio card**, **testimonial card**.
- **Form components** with inline validation, clear success/error states, spam
  protection (see ADR-0006), and an always-visible fallback ("or just call us").
- **SEO head** component (title, meta description, canonical, Open Graph, JSON-LD).
- **Image component** with lazy loading, responsive sizes, alt text, and a tasteful
  placeholder when no image exists yet.

### 5.3 Forms (public submissions)

All public forms:
- Capture the minimum needed; every field beyond name + phone is optional where
  possible.
- Store to a single **`service_requests`** concept with a `request_type` (see
  ADR-0005), plus a general **contact message** path.
- Show a confirmation with expected response time and the owner's direct contact as a
  fallback.
- Are protected against spam (ADR-0006) and rate-limited.
- Record `source` (which form / page) for analytics.
- Do **not** require the visitor to create an account.

| Form | Fields (all short) |
| --- | --- |
| **Book a Service** | Name*; Phone/WhatsApp*; Email (opt); Service needed (select)*; Vehicle make/model/year (opt); Registration (opt); Location / area*; **Preferred date\***; **Preferred time window\*** (e.g. morning / afternoon / specific); Notes (opt); Consent checkbox*. → `request_type = booking`. |
| **Request a Service** | Name*; Phone/WhatsApp*; Email (opt); Vehicle make/model/year (opt); Registration (opt); Location / area*; Service needed (select: repair, diagnostics, maintenance, assessment, road test, engineering/press & lathe, other); Describe the problem (opt); Preferred day/time (opt); Consent checkbox*. |
| **Request an Inspection** | Your name*; Phone/WhatsApp*; Email (opt); Vehicle make/model/year (opt); Mileage (opt); Where is the vehicle*; Seller contact / viewing time (opt); Target date (opt); Anything you're worried about (opt); Consent checkbox*. |
| **Contact** | Name*; Phone/WhatsApp or Email*; Message*; Consent checkbox*. |
| **Submit a testimonial** | First name*; Vehicle (free text, e.g. "Mercedes-Benz G-Wagon")*; Rating (opt); Your comment*; **Consent to publish first name + vehicle + comment\***. → creates `testimonial` `status = pending`. |

All quote requests are handled through **Book a Service** / **Request a Service** (there
is no separate price list — pricing is quote-based per vehicle).

`*` = required.

### 5.4 Non-functional requirements (public site)

| Area | Requirement |
| --- | --- |
| **Performance** | Lighthouse mobile ≥ 90 for Performance, SEO, Best Practices, Accessibility. Small JS payload; images optimised and lazy-loaded; content usable on 3G. |
| **Accessibility** | WCAG 2.1 AA: semantic HTML, keyboard navigable, sufficient contrast, labelled forms, focus states, `prefers-reduced-motion` respected. |
| **Responsiveness** | Designed mobile-first; no horizontal scroll; tap targets ≥ 44px. |
| **Resilience** | Core content readable if a form service or JS fails; contact number always visible as plain text/link. |
| **Privacy** | Privacy-friendly analytics (ADR-0011); cookie use minimised; consent language on forms. |
| **Browser support** | Recent Chrome, Safari (iOS), Firefox, Samsung Internet, Edge. |

---

## 6. Admin requirements

A single application area behind Supabase Auth. Usable on a phone. Fast to load. No
feature here is public. Every screen is backed by the same tables the public site
reads (with RLS enforcing who sees/edits what).

### 6.1 CRM functionality (MVP)

| Module | Capabilities |
| --- | --- |
| **Dashboard** | Counts (new requests, upcoming bookings, clients, vehicles, pending testimonials); list of recent / unhandled requests with quick status change; today's / this week's confirmed bookings; quick links to "add client", "add portfolio entry". |
| **Service requests** | List with filters (status, type, date); detail view with all submitted fields and internal notes; status pipeline: `new → contacted → scheduled → completed → closed` (plus `spam`/`archived`); **convert to client + vehicle** action; link an existing client/vehicle; record outcome notes. |
| **Schedule / bookings** | Agenda / list view of requests with `request_type = booking` and any request moved to `scheduled`, ordered by requested/confirmed date. Owner can **confirm** a booking (set the agreed date/time), **propose a new time**, or **decline**, which triggers the customer confirmation message (ADR-0008). MVP is an agenda, **not** a real-time availability calendar (that is Phase 5 — ADR-0013). |
| **Clients** | CRUD. Fields: name, type (individual / fleet-business), phone(s), WhatsApp, email, area/location, source, notes. List with search. One client → many vehicles → many service requests. |
| **Vehicles** | CRUD, attached to a client. Fields: make, model, year, registration, VIN (opt), colour, mileage, engine/fuel, transmission, notes. |
| **Notes / activity** | Free-text internal notes on clients, vehicles and service requests (lightweight; not a full CRM timeline in MVP). |

### 6.2 CMS functionality (MVP)

| Module | Capabilities |
| --- | --- |
| **Services** | CRUD. Fields: title, slug, category, short summary, full description (rich text), "what's included", FAQs (opt), icon, display order, **published** toggle, SEO title/description. Publishing makes it live on the site. |
| **Portfolio / projects** | CRUD. Fields: title, slug, category, vehicle make/model/year, summary, body (rich text), outcome, related service, date, cover image, gallery (media), **published** toggle. |
| **Testimonials** | CRUD + **moderation** of site-submitted feedback. Fields: first name, vehicle (free text), rating (opt), comment, source, submitted date, consent flag, **status** `pending → approved / rejected`, `featured` flag. Only `approved` show publicly, and only **first name + vehicle + comment** are exposed. |
| **Media library** | Upload images to Supabase Storage; set alt text and caption; basic list / search by tag; attach to portfolio entries and (optionally) services. Reused across the site. |
| **Website content (content blocks)** | Edit key page copy without a developer: hero text, about text, why-choose-us points, CTA text, service-areas intro, **pricing / quotes explainer**, etc. Keyed blocks with a friendly label and a rich-text or plain-text value. |
| **Service areas** | CRUD list of areas served (name, region, primary flag, note). Drives the Service Areas page; keeps coverage claims owner-controlled and accurate. |
| **Partners / affiliates** | CRUD short list of trusted bodywork shops / garages: name, type, note, area (opt), display order, published toggle. No URLs. Drives the named-partners section on About. |
| **Business information / settings** | Single settings record: business name, tagline, primary phone, WhatsApp number, email, hours, base area, social links, default SEO/OG values, Google Business Profile link, analytics IDs, notification channel + destination. Drives header, footer, contact page, structured data. |

### 6.3 Admin non-functional requirements

| Area | Requirement |
| --- | --- |
| **Auth** | Supabase Auth (email + password, or magic link — ADR-0007). No public sign-up. Seed one owner account. |
| **Authorization** | Role on the user profile (`owner`/`admin` now; room for `staff` later). RLS on every table: only authenticated admins read/write admin data; anon can only read published/approved public rows and insert into submission tables. |
| **Usability on mobile** | All CRUD usable one-handed on a phone; image upload works from a phone camera roll. |
| **Safety** | Confirm destructive actions; soft-delete or `archived` status preferred over hard delete for content and requests. |
| **Auditability (light)** | `created_at` / `updated_at` on all rows; `created_by` where meaningful. Full audit log is Post-MVP. |

---

## 7. MVP boundaries

### 7.1 In scope for MVP

**Public website**
- All pages in Section 5.1 (some may render as sections — design call), including
  **Engineering / Press & Lathe** service content and a **named partners** section.
- Click-to-call, WhatsApp deep links with pre-filled text.
- Submission forms → `service_requests` / contact / testimonial, with spam protection
  and owner notification: **Book a Service** (booking *request*), Request a Service,
  Request an Inspection, Contact, Submit a testimonial.
- **Booking requests** with preferred date + time window (owner-confirmed — ADR-0013).
  No real-time availability calendar in MVP.
- Public **testimonial submission**, moderated, displayed as first name + vehicle +
  comment.
- SEO foundation: per-page metadata, semantic markup, `sitemap.xml`, `robots.txt`,
  JSON-LD (`AutoRepair` / `LocalBusiness`), Open Graph, canonical URLs, fast
  Lighthouse scores.
- Privacy Policy page.
- Privacy-friendly analytics + Google Search Console verification.

**Admin platform**
- Supabase Auth login; one seeded owner; role field.
- Dashboard.
- CRM: Service requests (with pipeline + convert-to-client/vehicle), **Schedule /
  bookings agenda** (confirm / re-time / decline), Clients, Vehicles, internal notes.
- CMS: Services, Portfolio, Testimonials (with moderation), Media library,
  Content blocks, Service areas, **Partners / affiliates**, Business settings.

**Engineering foundation**
- React + TypeScript + Vite + Tailwind single application (public + admin routes).
- Supabase project: PostgreSQL schema, RLS policies, Auth, Storage buckets, seed data.
- ESLint + Prettier; Vitest + React Testing Library; meaningful test coverage on
  forms, RLS-affected data access, and critical admin flows.
- Git + GitHub; CI running lint + typecheck + test + build.
- Deployment of the static frontend to a host (ADR-0002); documented setup.
- Owner notification on new enquiries (ADR-0008 — mechanism to be chosen; Edge
  Function only if genuinely needed).

### 7.2 Explicitly NOT in MVP (Post-MVP)

- Service records / per-vehicle service history timeline.
- Job / work-order management (scheduling board, assignment, parts, labour).
- Structured inspection report builder + shareable link / PDF.
- Quotes and invoices (and any payment collection, e.g. M-Pesa).
- Customer accounts / customer-facing portal or login.
- Maintenance reminders (WhatsApp / SMS / email automation).
- **Self-service real-time booking against a live availability calendar**, automatic
  slot holds, reschedule/cancel links, calendar (Google) sync, and booking reminders.
  *(MVP ships booking **requests** the owner confirms; the availability engine is
  **Phase 5** — ADR-0013.)*
- Blog / articles / resource centre for content-marketing SEO.
- Multi-staff roles, permissions matrix, full audit log.
- WhatsApp Business API integration (structured intake / templated replies).
- In-admin analytics dashboards.
- Multi-language (Swahili) content.

### 7.3 Future product ideas (not committed)

- **Multi-tenant SaaS** for other independent mechanics / small garages (productising
  this build — the TECHBIGGIEY opportunity).
- Parts inventory and supplier management.
- Technician PWA with offline capture on-site.
- Fleet customer dashboards and scheduled servicing contracts.
- Integration with OBD / diagnostic tooling and vehicle data.
- Vetted affiliate marketplace (bodywork, electrical, AC, tyres, parts).
- Automated review requests feeding Google Business Profile + on-site testimonials.

---

## 8. SEO requirements

Goal (BO-1): be discoverable for automotive-service searches in and around Kitengela,
without claiming coverage or capabilities we cannot substantiate.

### 8.1 Local SEO

- **Google Business Profile** is the single highest-impact asset. It **already exists**
  for "Platinum Point Automotive Engineering" (owner shared a link). The site must:
  keep **NAP** (business name, service-area/location, phone `+254 722 322870`)
  consistent with the GBP; link to the GBP (`sameAs`); and be structured for a
  **service-area business** based near Shell Kitengela Service Station (Yukos). Still
  needed: opening hours as text, GBP management access, and a check that the listing's
  name/category/phone match what we publish.
- **`LocalBusiness` / `AutoRepair` JSON-LD** on the site, populated from Business
  Settings: name, description, `areaServed` (Kitengela + Kenya-by-arrangement),
  `telephone`, `openingHours`, `sameAs` (social / GBP), geo (approx, area-level).
- **Service Areas page** driven by owner-managed data. Confirmed language: **core area
  "Kitengela and its environs"**, plus **"available anywhere in Kenya by arrangement
  where transport is facilitated"**. Named sub-areas as the owner supplies them. Avoid
  implying free call-outs across the whole country.
- Consistent citations later (directories) — Post-MVP task, noted for content
  strategy.

### 8.2 Keyword themes (to validate with the owner and Search Console)

Grouped by intent; exact phrasing and priority to be confirmed:

- **Mobile mechanic:** "mobile mechanic Kitengela", "mobile mechanic Nairobi",
  "mechanic who comes to you Kenya", "car repair at home Kitengela".
- **General repair / service:** "car service Kitengela", "car repair Kitengela",
  "mechanic near me Kitengela", "[make] mechanic Nairobi" (Toyota, Nissan, Subaru,
  Mazda, VW, Mercedes, etc. — the breadth of the owner's experience).
- **Diagnostics:** "car diagnostics Kitengela / Nairobi", "engine check light
  diagnosis Kenya", "computer diagnostics car Nairobi".
- **Pre-purchase inspection:** "pre-purchase car inspection Nairobi",
  "car inspection before buying Kenya", "used car check Kitengela",
  "vehicle assessment Nairobi", "mechanical inspection before buying".
- **Preventive maintenance:** "car service schedule Kenya", "vehicle maintenance
  Kitengela".
- **Engineering:** "press and lathe services Kitengela", "machining services Kajiado",
  "hydraulic press Kitengela", "bush press / bearing press Nairobi", "brake disc
  skimming Nairobi", "flywheel machining Kenya". *(Confirmed in scope — also a lead
  channel into brake and suspension work.)*
- **Booking intent:** "book a mechanic online Kenya", "schedule car service Kitengela".

### 8.3 On-page SEO

- One clear `<h1>` per page; logical heading hierarchy; descriptive, unique
  `<title>` and meta description per page (editable defaults in Business Settings,
  per-item overrides on services / portfolio).
- Human-readable slugs (`/services/pre-purchase-inspection`).
- Internal linking: services ↔ related portfolio ↔ CTAs.
- Image alt text (enforced in the media library).
- Structured data: `AutoRepair`/`LocalBusiness`, `Service`, `BreadcrumbList`,
  `Review`/`AggregateRating` (from approved testimonials, used honestly).

### 8.4 Technical SEO

- Server-renderable / statically-generated public pages (fast first paint, crawlable
  content) — see `decisions.md` ADR-0003 for the rendering approach.
- `sitemap.xml` (generated, includes published services/portfolio) and `robots.txt`.
- Canonical URLs; no duplicate content between section and page variants.
- Fast Core Web Vitals; correct caching headers on the host.
- HTTPS, correct redirects (www/non-www, trailing slash consistency).
- Admin routes `noindex` and excluded from sitemap.
- Google Search Console verified; sitemap submitted.

### 8.5 SEO guardrails

- **Do not publish unsupported claims** about geographic coverage, certifications,
  partnerships, years, number of vehicles serviced, or affiliations. All such claims
  come from owner-confirmed content in the admin, and are listed as open questions
  until confirmed.

---

## 9. Content strategy

The owner does **not** currently have a full set of professional photographs, a
complete portfolio, or a bank of written testimonials. **This must not block the
project.** The system is designed so content is added continuously through the admin.

### 9.1 Principles

1. **Launch with honest, modest content; grow it.** Better to show three real jobs
   well than to pad with stock imagery.
2. **Every content type is admin-managed and incremental** — services, portfolio
   entries, testimonials, media, page copy, service areas, business info.
3. **Graceful empty and sparse states.** Portfolio with 1 entry, Testimonials with 2,
   a service with no image — all must look intentional, not broken.
4. **Placeholders are tasteful, not fake.** Neutral illustrative graphics / iconography
   rather than stock photos implying work that isn't documented.
5. **Capture content at the moment of work.** Workflow habit for the owner: photograph
   each job (before/after), note make/model and what was done, and ask the customer
   for a short testimonial and permission to use photos. The admin should make logging
   a job entry take two minutes on a phone.

### 9.2 Content backlog (indicative, owner-driven)

| Priority | Content | Status / notes |
| --- | --- | --- |
| P0 (launch) | Identity, phone, email, base area — **confirmed** (§0.1). Opening hours (text) — **needed** (§14). About / owner background (Paul's DT Dobie career, vehicle types) — owner to draft. 6–10 services incl. **Engineering / Press & Lathe** with plain-language descriptions — owner to provide/review. Service areas list. Quote/pricing explainer copy. 3–5 portfolio entries (text-first OK). A few named bodywork/garage partners. 2–5 seed testimonials (with consent). Privacy Policy content source. | Owner confirmed he can provide service/job/About content. Photos "will be found". |
| P1 (weeks after launch) | Photos for services & portfolio; more portfolio entries; incoming site-submitted testimonials; FAQs per service; press/lathe equipment photos. | Ongoing, via admin. |
| P2 (Post-MVP) | Blog / how-to articles for SEO; area-specific landing content; video; occasional Swahili phrasing where it helps reach. | Requires editorial effort. |

### 9.3 Image handling

- Uploaded via the admin media library to Supabase Storage.
- Alt text required; caption optional.
- Server-side / on-delivery resizing and format optimisation (ADR-0009).
- Reasonable size limits and accepted formats enforced in the UI.

---

## 10. Branding

**Some branding already exists** (owner-confirmed), and the owner has **strong
appetite** for proper brand work and will supply / commission whatever is needed.
Nothing about the brand is *locked* in Phase 0 — but this is no longer a blank slate.

### 10.1 What we can state now (direction, not decisions)

- **Name:** **Platinum Point Automotive Engineering**. Whether a registered limited
  company ("… Engineering Limited") exists — and the exact legal footer wording — is
  still open (§14). A short form ("Platinum Point") may be useful for the logo lockup —
  owner to confirm.
- **Personality:** professional, competent, trustworthy, straightforward, local. Not
  flashy. "The expert who comes to you." The word **"Engineering"** in the name is a
  real asset — it backs the press/lathe capability and a precision tone.
- **Credibility cues:** former **DT Dobie** engineer (Mr. Paul Ndirangu Gatama);
  breadth across many vehicle types; in-house press & lathe engineering; trusted
  bodywork/garage partner network.
- **Implication of the name:** "Platinum" + "Engineering" → clean, dependable,
  quality-first; not budget.

### 10.2 Supplied brand system — "Rev 01" asset pack (2026-09-07)

The owner supplied a brand-direction pack
(`Platinum Point Brand Assets.dc.html`, "Asset Pack · Rev 01 · 2026"). It is a
**complete first-round direction**, not yet formally signed off, and the production
files still need to be produced (see 10.4). It defines:

**Logo**
- A circular **"datum mark"** — concentric rings + crosshair ticks with a triangle
  (apex) and a **Signal Amber node** at the apex. Reads as an instrument gauge / sight
  — fits "Automotive Engineering".
- Variants shown: full-colour, one-colour black (fax/stamp/etch), reversed white,
  reversed with amber node; **horizontal lockup** (primary) and **stacked lockup**;
  a **"PP" monogram** (Newsreader) for embroidery/stamps; an **icon** (graphite tile)
  for favicon/avatar/app.
- Lockup wordmark: **"Platinum Point"** in Archivo 700 + **"Automotive Engineering"**
  as a letter-spaced IBM Plex Mono caps descriptor.
- 14 SVG masters referenced under `/brand-assets/` (`ppae-*.svg`) — **not yet
  delivered as files.**

**Colour tokens** (HEX authoritative; CMYK/Pantone in the pack for print):

| Token | HEX | Role |
| --- | --- | --- |
| Graphite | `#14171A` | Primary. Ink, dark grounds, vehicle wrap |
| Slate | `#2A2F34` | Secondary surfaces, workwear |
| Signal Amber | `#C8752A` | **Accent only** — one action / one rule per view; ≤ 10% of any surface |
| Instrument Teal | `#1E6E6A` | Pass / success states, readings, charts |
| Steel | `#6B7580` | Captions, secondary text |
| Platinum | `#C6CBD0` | Keylines, rules, dividers; body text on graphite |
| Mist | `#EEF0F1` | Panels, alternating rows |
| Paper | `#F7F7F5` | Page ground |

Usage ratio **60 / 30 / 10** (graphite-or-paper / platinum-and-mist / signal).
Accessibility note from the pack: amber on graphite only at **≥ 18px**; for body text
on graphite use Platinum `#C6CBD0`. *(We will still re-check every text/background
pair against WCAG AA during the build.)*

**Typography** — all three under SIL OFL 1.1 (free, embeddable), from Google Fonts:

| Face | Use | Weights |
| --- | --- | --- |
| **Archivo** | Wordmark, all headings, body | 400/500/600/700/800 |
| **IBM Plex Mono** | Descriptor line, labels, all technical data (reg numbers, codes, readings) | 400/500 |
| **Newsreader** | Monogram only — never body, headings, or the wordmark | 600 |

Substitutes: Archivo → Archivo Narrow (tight signage) or Helvetica Neue Bold (last
resort); IBM Plex Mono → Roboto Mono. The logo file is always placed, never re-set.

**How this lands in the build:** these become the Tailwind theme tokens / CSS
variables from Phase 1 (one central place — mitigates risk R-13). No component
hard-codes a hex or font. Until the production logo SVGs arrive, the lockup can be set
live from Archivo + IBM Plex Mono as a temporary stand-in.

### 10.3 Brand decision status

The earlier open choice (keep existing logo / refresh / full rebrand) is effectively
answered: **Rev 01 is a new mark + full system.** Remaining owner input:
1. **Sign off Rev 01** as the direction, or list changes.
2. Confirm the **"Platinum Point" + "Automotive Engineering" descriptor** lockup is the
   preferred public name treatment (the full legal name still appears in the footer).
3. Approve commissioning the **production asset set** (10.4) from Rev 01.

### 10.4 Branding asset request — what's provided vs. still needed

`[x]` = covered by the Rev 01 pack (10.2). `[ ]` = still needed.

**Logo & marks**
- [ ] **Production SVG masters** — the 14 `ppae-*.svg` files referenced in the pack
      (marks, lockups horizontal + stacked, monogram, icon), delivered as actual files
      with the live text converted to outlines. The pack shows them but does not
      include them.
- [x] Variant set defined: full-colour, black, reversed white, reversed amber-node,
      horizontal & stacked lockups, monogram, icon.
- [ ] **Favicon** (16/32/180 px) and **social share image** (1200×630) derived from the
      icon / lockup.
- [ ] Any *existing* prior logo / where a logo is currently used (overalls, signage,
      stamp, vehicle, invoice) — so Rev 01 can replace it consistently.

**Colour & type**
- [x] Palette with HEX / RGB / CMYK / Pantone and usage ratio (10.2).
- [x] Type stack: Archivo, IBM Plex Mono, Newsreader (all SIL OFL 1.1) with role rules
      and substitutes.

**Existing collateral (photos are fine)**
- [ ] Business card, letterhead, invoice/quote/receipt template (current, if any).
- [ ] Signage / banner / workshop board.
- [ ] Current WhatsApp Business profile image and Facebook/Instagram/TikTok profile +
      cover images.
- [ ] Any stamp / watermark used on documents.

**Words**
- [ ] Tagline / slogan — the pack doesn't set one; confirm if there is one or if we
      draft options.
- [x] Name lockup direction: "Platinum Point" + "Automotive Engineering" descriptor
      (owner to confirm — 10.3).
- [x] Brand guidance: the Rev 01 pack itself (pending sign-off).

**Photography (for the site, ongoing)**
- [ ] Job photos (before/after), workshop, tools, the press and lathe in use.
- [ ] A portrait of Mr. Paul Ndirangu Gatama for the About page.
- [ ] Permission notes: which photos can be published, any plates/faces to blur.

**Accounts & links**
- [ ] Social handles / URLs.
- [ ] Google Business Profile management access (or confirm who holds it).

---

## 11. Data model requirements (conceptual only — NO migrations)

This is a conceptual model to validate scope and the "one dataset, two faces"
principle. **No schema, types, or migrations are created in Phase 0.** Field lists are
indicative.

### 11.1 Core entities (MVP)

| Entity | Purpose | Key attributes (indicative) | Relationships | Public visibility |
| --- | --- | --- | --- | --- |
| **client** | A customer (person or business). | name, type (individual/fleet), phone, whatsapp, email, area, source, notes, timestamps | has many **vehicle**, has many **service_request** | Private (admin only). |
| **vehicle** | A customer's vehicle. | client_id, make, model, year, registration, vin?, colour, mileage, fuel/engine, transmission, notes, timestamps | belongs to **client**, has many **service_request** | Private. |
| **service_request** | An enquiry / request / **booking request** from any channel. | request_type (`booking`, `general_repair`, `diagnostics`, `maintenance`, `assessment`, `road_test`, `mechanical_inspection`, `pre_purchase_inspection`, `engineering`, `other`, `general_contact`), status, contact name/phone/whatsapp/email, vehicle_description (free text), area/location, **requested_date?**, **requested_time_window?**, **confirmed_at?**, preferred_time (free text), message, consent, source, client_id? (nullable), vehicle_id? (nullable), internal_notes, outcome_notes, timestamps | may link to **client** and **vehicle** (after conversion) | **Insert** via the protected submission path (ADR-0006). No public read. |
| **service** | A service the business offers (incl. engineering / press & lathe). | title, slug, category, summary, description, whats_included, faqs?, icon, display_order, is_published, seo_title, seo_description, timestamps | referenced by **portfolio_project** (related service) | Public **read** where `is_published`. |
| **portfolio_project** | A documented piece of work. | title, slug, category, vehicle_make/model/year, summary, body, outcome, service_id?, project_date, cover_media_id?, is_published, timestamps | has many **media** (gallery), may reference **service** | Public **read** where `is_published`. |
| **testimonial** | Site-submitted customer feedback. | **first_name**, **vehicle_label** (free text, e.g. "Mercedes-Benz G-Wagon"), rating?, comment, consent (bool), source, status (`pending`/`approved`/`rejected`), is_featured, submitted_at, timestamps | — | Public **read** where `status = approved`, exposing **only** first_name + vehicle_label + comment + rating. Public **insert** as `pending` via the protected submission path. |
| **media** | An uploaded image (and metadata). | storage_path, alt_text, caption?, tags?, width/height?, uploaded_by, timestamps | attached to **portfolio_project** (and optionally **service**) | Public **read** for images referenced by published content; file served from a public Storage bucket. |
| **content_block** | Editable website copy. | key, label, group/page, value (text/rich), timestamps | — | Public **read** (site copy). Admin write. |
| **service_area** | An area the business serves. | name, region, is_primary, note?, display_order | — | Public **read**. Core = Kitengela + environs; a flag/row expresses "rest of Kenya by arrangement". |
| **partner** | A trusted bodywork shop / garage affiliate. | name, type (bodywork/garage/parts/other), note?, area?, display_order, is_published, timestamps | — | Public **read** where `is_published`. No URLs. |
| **site_settings** | Single business-info record. | business_name, legal_name?, tagline, phone, whatsapp, email, hours, base_area, geo?, social_links, gbp_url, default_seo, analytics_id, notification_channel, notification_destination | — | Public **read** for the public subset (contact info, hours, SEO defaults, GBP link); admin write. Notification fields and any keys are **not** in the public read. |
| **profile** (admin user) | Admin identity + role. | user_id (Supabase Auth), display_name, role (owner/admin/…), timestamps | 1:1 with `auth.users` | Private. No public read. |

### 11.2 Naming reserved for later phases (do not build now)

`service_record` / `service_history`, `job` / `work_order`, `inspection_report`,
`quote`, `invoice`, `payment`, `reminder`, `customer_account`, `staff` /
`assignment`, `audit_log`, `part` / `inventory`, `supplier`, and (Phase 5)
`availability_window` / `booking_slot` for the self-service scheduler. Named here so
later phases extend the model rather than reshape it.

### 11.3 Model notes

- **Consolidated intake:** all public forms and enquiry channels — including the
  **Book a Service** form — funnel into `service_request`, distinguished by
  `request_type` (`booking` for scheduling requests). See `decisions.md` ADR-0005
  (**requires approval**) and ADR-0013 (booking approach).
- **Booking fields:** `requested_date`, `requested_time_window`, and `confirmed_at`
  live on `service_request` in MVP. The Phase 5 scheduler adds availability tables and
  hard slots without changing this shape.
- **Loose linking:** a `service_request` can exist with no `client`/`vehicle` and be
  linked on conversion; `vehicle_description` free text covers pre-conversion data.
- **Publish/approve gates** (`is_published`, `status`) are the mechanism behind
  "admin creates → appears publicly". RLS enforces that anon only ever sees gated
  rows.
- **Testimonials:** stored with more than is shown; the public read exposes only
  `first_name`, `vehicle_label`, `comment`, `rating`.
- **Storage buckets:** at least one **public** bucket for website images; a
  **private** bucket may be added later for internal documents (Post-MVP).

---

## 12. Security requirements

### 12.1 Authentication

- Admin access via **Supabase Auth**. Mechanism (email+password vs magic link vs both)
  decided in `decisions.md` ADR-0007. **No public/self sign-up** — accounts are
  created deliberately.
- One **owner** account seeded for launch.
- Session handling per Supabase defaults; secure token storage; sensible expiry.
- Password reset / recovery flow available to the owner.

### 12.2 Authorization

- **Role on `profile`** (`owner`/`admin` for MVP; `staff` and finer roles later).
- **Row Level Security enabled on every table.** No table is left open.
- **Public (anon) role:**
  - `SELECT` only on: `service` where `is_published`; `portfolio_project` where
    `is_published`; `testimonial` where `status = approved` (and only the display
    columns); `service_area`; `partner` where `is_published`; `content_block`; the
    **public subset** of `site_settings`; `media` rows tied to published content.
  - **Writes:** `service_request` (incl. `booking`) and `testimonial` (`pending`) are
    created **only through the protected submission Edge Function** (Turnstile-verified,
    validated, rate-limited — ADR-0006). Direct anon `INSERT` on these tables is **not**
    granted; the function writes with a scoped server-side key and forces
    `status`/`request_type` server-side. *(Fallback if the function is descoped:
    constrained direct anon `INSERT` with `CHECK` constraints + honeypot + client-side
    Turnstile.)*
  - **No** `UPDATE`/`DELETE`, **no** read of private tables (`client`, `vehicle`,
    `profile`, `service_request`).
- **Authenticated admin role:** full CRUD on business data, gated by `role` in RLS
  policies (and/or Postgres roles / `security definer` helpers as appropriate).
- **Storage:** public bucket = public read, admin-only write/delete; any private
  bucket = admin-only read/write.

### 12.3 Data isolation & protection

- Customer PII (names, phone numbers, vehicle registrations) is **never** exposed to
  anon. Verified by tests against the anon client.
- Public form submissions:
  - **Spam / abuse protection** (ADR-0006) and **rate limiting**.
  - **Consent language** and a Privacy Policy, reflecting the **Kenya Data Protection
    Act, 2019** (data controller obligations, lawful basis, retention, subject rights).
    Whether formal ODPC registration is required is an **open question** for the owner.
  - Input validation and sanitisation; rich-text fields sanitised on render.
- **Secrets** (Supabase service-role key, any email API key, analytics tokens) live in
  environment variables / CI secrets, never in the client bundle or the repo. Only the
  Supabase **anon** key ships to the browser, relying on RLS for safety.
- **Transport:** HTTPS everywhere; HSTS on the host.
- **Backups:** rely on Supabase's managed backups for MVP; document the plan and
  restore expectations. Periodic export considered Post-MVP.
- **Dependency hygiene:** lockfile committed; automated dependency/security updates
  (e.g. Dependabot) enabled in CI.
- **Least privilege:** the frontend uses only the anon key; any privileged operation
  (notifications, admin seeding) uses the service role **only** server-side (CI, a
  one-off script, or an Edge Function if genuinely needed).

### 12.4 Out of scope for MVP security

- Customer-facing accounts and their data-access rules (no portal in MVP).
- Fine-grained staff permissions and full audit logging.
- 2FA for admin (consider Post-MVP).

---

## 13. Risks

| # | Risk | Type | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- | --- | --- |
| R-1 | **RLS misconfiguration** exposes customer PII or lets anon write freely. | Technical / security | High | Medium | RLS on from day one; automated tests using the anon key asserting no access to private tables and constrained inserts; review policies in the implementation gate; least-privilege keys. |
| R-2 | **Thin content at launch** (few photos, few portfolio entries, few testimonials) makes the site feel empty / less credible. | Content | Medium | High | Graceful sparse states; text-first portfolio entries; tasteful placeholders; content-capture habit + admin that makes logging fast; P0 content checklist. |
| R-3 | **Owner doesn't maintain the CMS** (time, mobile-only, low incentive). | Operational | Medium | Medium | Extremely simple admin, phone-friendly; sensible defaults so an un-maintained site still looks fine; short "how to update your site" guide. |
| R-4 | **Unsupported claims** (coverage areas, affiliations, certifications) create trust or legal issues. | Business / legal | Medium | Medium | All such claims are owner-confirmed admin content; open questions block launch copy; SEO guardrails (8.5). |
| R-5 | **Spam / abusive form submissions** flood the owner and pollute the CRM. | Technical / operational | Medium | High | Turnstile/hCaptcha + honeypot + rate limiting (ADR-0006); `spam` status; email notification throttling. |
| R-6 | **Enquiry notifications fail** (email deliverability, no server) so leads are missed. | Technical / business | High | Medium | Dashboard is the source of truth; notification is a secondary aid; if email is used, use a reputable API (ADR-0008) and monitor; always show owner's direct contact as fallback on the site. |
| R-7 | **Supabase lock-in / cost growth** (Storage, bandwidth, row counts) as content and traffic grow. | Technical / business | Medium | Low–Medium | Standard Postgres + Storage (portable); monitor usage; image optimisation; free tiers adequate for expected early volume; revisit at Post-MVP. |
| R-8 | **Scope creep** toward full job management before MVP ships. | Project | High | High | Phase gates; this document's Section 7 boundaries; reserved-naming list; explicit approval required per phase. |
| R-9 | **Single-owner bottleneck** — owner is the only content author, approver, and responder, and works mobile with limited time. | Operational | Medium | High | Data model allows a second admin user; low-effort workflows; email/WhatsApp handoff patterns documented Post-MVP. |
| R-10 | **Connectivity / device constraints in Kenya** (mobile data cost, mid-range Android, patchy signal) for both visitors and the owner. | Technical / UX | Medium | High | Strict performance budget; small bundles; offline-tolerant reading; minimal images; test on a real mid-range device / throttled network. |
| R-11 | **Domain / hosting / account ownership** unclear — who owns the domain, the Supabase org, the GBP, billing. | Operational / business | High | Medium | Decide and document ownership before launch (open questions); use accounts owned by the business/owner, not personal dev accounts. |
| R-12 | **Data protection non-compliance** (Kenya DPA 2019) — collecting personal data without adequate notice / basis / possible ODPC registration. | Legal | Medium | Medium | Privacy Policy + consent at Phase 2; retention policy; confirm ODPC obligations with the owner (open question). |
| R-13 | **Brand applied late** causes rework if components aren't tokenised. | Technical | Low | Medium | Centralise theme tokens from the start; no hard-coded brand values in components. |
| R-14 | **Testimonial / photo consent** not obtained from past customers. | Legal / content | Low–Medium | Medium | Only publish `approved` testimonials with recorded consent; capture consent at job time; keep names optional / initials where consent is limited. |
| R-15 | **Portfolio reveals customer identity** (visible number plates, faces, locations). | Legal / privacy | Medium | Medium | Editorial guidance to blur/omit plates and faces; owner reviews before publishing; media guidelines in the content strategy. |
| R-16 | **WhatsApp remains the real channel** and website enquiries are ignored in practice. | Operational | Medium | Medium | Make WhatsApp a first-class CTA (deep links with context); ensure form submissions also nudge toward / capture WhatsApp; measure channel mix. |
| R-17 | **Over-engineering for a small business** (SaaS-shaped abstractions now). | Project | Medium | Medium | "Right-sized" principle; no multi-tenant, no plugin systems, no premature generalisation in MVP; revisit only if the productisation path is chosen. |
| R-18 | **Booking expectation mismatch** — owner asked for "booking and scheduling"; MVP ships booking *requests* he must confirm, not instant self-service slots. Customers may expect instant confirmation. | Product / UX | Medium | Medium | Clear copy on the Book page ("we'll confirm your time within X hours"); fast owner confirmation via the Schedule view + notification; Phase 5 delivers real self-service slots (ADR-0013); confirm the phased plan with the owner (§14.2 Q11). |
| R-19 | **Personal Gmail as the business address** (`gatama98p@gmail.com`) looks less credible and mixes personal/business mail; deliverability of notifications to a Gmail inbox (spam foldering). | Business / technical | Low–Medium | Medium | Recommend a branded mailbox once the domain is chosen; meanwhile use a reputable transactional sender with SPF/DKIM; dashboard remains source of truth (R-6). |

---

## 14. Open questions

**We do not invent answers.** This section now has two parts: what the owner **answered
on 2026-09-07** (rev. 2), and what is **still open**.

### 14.1 Answered on 2026-09-07

| Was | Answer (summarised — see §0.1) |
| --- | --- |
| Business name | **Platinum Point Automotive Engineering**. |
| Primary phone | **+254 722 322870** (Paul). |
| Public email | **gatama98p@gmail.com**. |
| Location | Operates near **Shell Kitengela Service Station**, Yukos ("JAJEMELO YUKOS"). |
| Business hours | "In our Google Business Profile" (link shared) — *hours as text still needed, see below*. |
| Owner name | **Mr. Paul Ndirangu Gatama** — may be featured. |
| Reference "DT Dobie" | **Yes**, permitted. |
| Service areas | **Kitengela + environs**; **anywhere in Kenya by arrangement, transport facilitated**. |
| Engineering / press & lathe | **Include** as first-class services and lead generators. |
| Pricing | **Quote-based**; adjustable CMS explainer; no fixed price list. |
| Bodywork affiliates | **Name a few** partner shops/garages (no websites → name + note only). |
| Online booking | **Wanted** — proceeding with a phased approach (ADR-0013): booking *requests* in MVP, self-service availability calendar in Phase 5. |
| Owner-provided content | **Yes**, owner can provide service/job/About content. |
| Existing photos | "We'll find" — sourced over time; not a blocker. |
| Testimonials | **Public submission**, moderated; publish **first name + vehicle type** only. |
| Language | **English-primary/formal**; incidental **Swahili** acceptable; no i18n framework in MVP. |
| Branding | **Exists**, with **appetite** for more; asset request in §10.4; owner will supply. |

### 14.2 Still open

**🔴 = likely to block launch content or a decision.**

**Business identity & contact**
1. 🔴 **Opening hours as text** for each day (we could not read them from the shared
   GBP link). Also: is after-hours / emergency call-out offered?
2. Is **+254 722 322870** also the **WhatsApp** number? Any second phone line?
3. Is the business a **registered company** ("Platinum Point Automotive Engineering
   Limited" or similar)? Exact legal name for the website footer / invoices.
4. A **branded email** (e.g. `info@`your-domain) now, or keep the Gmail for launch?

**Services & content**
5. 🔴 Final **service list** and short plain-language descriptions (review our draft
   set, incl. the engineering services).
6. The **few** bodywork/garage **partners** to name publicly (name + area + one line
   each), and confirmation they're OK being listed.
7. 3–5 **past jobs** for the portfolio (vehicle, problem, fix, outcome) — text is fine
   to start.
8. **About** copy: Paul's DT Dobie years, the vehicle types/marques he's strongest on,
   the story of going mobile.
9. 2–5 **seed testimonials** with consent, in the "first name, vehicle" format, to
   launch with.
10. **Privacy Policy** content source — a lawyer, a template you like, or draft one for
    your review?

**Booking (ADR-0013)**
11. 🔴 Confirm the **phased booking plan** is acceptable: MVP = customer submits a
    preferred date + time window, **you confirm** it in the admin; Phase 5 = customers
    pick a real open slot automatically. (You asked for "booking and scheduling" — this
    is how we'd stage it so you never get auto-double-booked while mobile.)
12. Typical **lead time** you want to require (e.g. "at least 1 day ahead") and the
    **time windows** to offer (morning / afternoon / specific hours?).

**Accounts, hosting & operations**
13. 🔴 **Domain name** preference (e.g. `platinumpoint.co.ke`, `platinumpointautomotive.co.ke`,
    `.com`) — and **who registers and pays** (must be a business-owned account).
14. 🔴 **Google Business Profile management access** — can you add us / confirm who
    controls it? Does the listing's name, category, phone and area match what we'll
    publish?
15. Who **owns the Supabase org and the hosting account**, who pays, and is there a
    **monthly budget ceiling**? (Free tiers likely cover launch.)
16. Any **existing Google Analytics / Search Console** property to reuse?
17. Who **administers day-to-day** — Paul only, or someone else too (do we seed a
    second admin login)?

**Legal / compliance**
18. Does the business need **ODPC registration** under the Kenya Data Protection Act
    2019 (data-controller)? 
19. **Data retention** preference for enquiries / customer records (keep indefinitely,
    or purge non-converted enquiries after N months?).

**Notifications (ADR-0008)**
20. How do you want to be **alerted to a new enquiry / booking**: email to
    gatama98p@gmail.com, a WhatsApp message, SMS, more than one, or just check the
    dashboard?

**Timeline & branding**
21. **Target launch date** or any external deadline?
22. **Sign off the Rev 01 brand pack** (§10.2) as the direction, or list changes; and
    confirm the "Platinum Point" + descriptor lockup as the public name treatment.
23. Approve producing the **Rev 01 production asset set** (§10.4): the 14 `ppae-*.svg`
    masters + favicon + social image. (These are the last blockers on applying the real
    brand; the token set can go into the build now regardless.)
24. Is there a **tagline / slogan**, or should we draft options? (Rev 01 sets none.)

---

## Appendix A — Requirement → section traceability

| Phase 0 requirement | Covered in |
| --- | --- |
| 1. Product vision | §1 |
| 2. Business objectives | §2 |
| 3. Target users | §3 |
| 4. Customer journeys | §4 |
| 5. Public website requirements | §5 |
| 6. Admin requirements | §6 |
| 7. MVP boundaries | §7 |
| 8. SEO requirements | §8 |
| 9. Content strategy | §9 |
| 10. Branding | §10 |
| 11. Data model requirements | §11 |
| 12. Security requirements | §12 |
| 13. Risks | §13 |
| 14. Open questions | §14 |
| Architectural principle (shared data) | §1 (principles), §5 (data source column), §11.3 |

## Appendix B — Related documents

- `project-state.md` — current baseline, what exists, change log.
- `decisions.md` — architecture decision records; which need approval.
- `roadmap.md` — phase gates and sequencing.
