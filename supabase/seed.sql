-- Platinum Point Automotive Engineering — Phase 2 seed content (docs/phase-2-plan.md WP10)
--
-- Idempotent (re-runnable). Confirmed facts are marked [CONFIRMED]; everything else is
-- DRAFT copy for the owner to review/replace via the Phase 3 admin.
--   apply:  npx supabase db reset   (local)   or   psql "$DB_URL" -f supabase/seed.sql

-- ===========================================================================
-- site_settings  (single row)   [CONFIRMED except default_seo.ogImage]
-- ===========================================================================
insert into public.site_settings (
  id, business_name, legal_name, tagline, phone, whatsapp, email, hours, base_area,
  geo, social_links, gbp_url, default_seo, notification_channel, notification_email
) values (
  true,
  'Platinum Point Automotive Engineering',
  null, -- legal name TBC (§14.2 Q3)
  'The expert who comes to you.',
  '+254722322870',
  '254722322870',
  'gatama98p@gmail.com',
  '[{"days":"Mon – Sat","open":"09:00","close":"19:30","label":"9:00 AM – 7:30 PM"},
    {"days":"Sunday","open":"14:45","close":"19:30","label":"2:45 PM – 7:30 PM"}]'::jsonb,
  'Kitengela (near Shell Kitengela Service Station, Yukos)',
  null,
  '{}'::jsonb,
  null, -- GBP URL to be added once management access is granted (§14.2 Q14)
  '{"title":"Platinum Point Automotive Engineering","description":"Mobile mechanic, diagnostics, pre-purchase inspections, preventive maintenance and engineering (press & lathe). Kitengela and across Kenya by arrangement."}'::jsonb,
  'email',
  'gatama98p@gmail.com'
)
on conflict (id) do update set
  business_name = excluded.business_name,
  tagline = excluded.tagline,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  email = excluded.email,
  hours = excluded.hours,
  base_area = excluded.base_area,
  default_seo = excluded.default_seo,
  notification_email = excluded.notification_email;

-- ===========================================================================
-- service_area   [CONFIRMED §14.2 Q8]
-- ===========================================================================
insert into public.service_area (name, region, is_primary, note, display_order) values
  ('Kitengela', 'Kajiado', true, 'Home base — near Shell Kitengela Service Station, Yukos.', 10),
  ('Athi River / Mlolongo', 'Machakos', false, null, 20),
  ('Kajiado & Isinya', 'Kajiado', false, null, 30),
  ('Nairobi', 'Nairobi', false, 'Across Nairobi by arrangement.', 40),
  ('Rest of Kenya', null, false, 'Available countrywide by arrangement where transport is facilitated.', 100)
on conflict do nothing;

-- ===========================================================================
-- partner   [CONFIRMED placeholder §14.2 Q6 — owner adds real partners in Phase 3]
-- ===========================================================================
insert into public.partner (name, type, note, area, display_order, is_published) values
  ('TECHBIGGIEY', 'other', 'Digital and technology partner.', null, 10, true)
on conflict do nothing;

-- ===========================================================================
-- service   [DRAFT copy — owner to review §14.2 Q5]
-- ===========================================================================
insert into public.service (slug, title, category, summary, description_md, display_order, is_published, seo_title, seo_description) values
  ('mobile-mechanic-general-repairs', 'Mobile Mechanic & General Repairs', 'Repairs',
   'General mechanical repairs carried out wherever your vehicle is — home, office or roadside.',
   E'We diagnose and repair engines, transmissions, brakes, suspension, cooling, electrical and more, across a wide range of makes. Work is done at your location; parts are sourced from trusted suppliers.\n\n_Draft copy — pending owner review._',
   10, true, 'Mobile Mechanic in Kitengela | Platinum Point Automotive Engineering',
   'A DT Dobie–trained mechanic who comes to you for general repairs in Kitengela and across Kenya by arrangement.'),

  ('vehicle-diagnostics', 'Vehicle Diagnostics', 'Diagnostics',
   'Computer and hands-on diagnosis to find the real cause of a fault before you spend on parts.',
   E'Fault-code scanning, live data, and physical inspection to pinpoint the problem accurately. You get a plain-language explanation and a recommended fix.\n\n_Draft copy — pending owner review._',
   20, true, 'Car Diagnostics in Kitengela & Nairobi | Platinum Point',
   'Accurate computer and mechanical diagnostics for your vehicle — mobile, in Kitengela and Nairobi by arrangement.'),

  ('pre-purchase-inspection', 'Pre-Purchase Vehicle Inspection', 'Inspections',
   'An independent check of a used car before you buy — done wherever the vehicle is.',
   E'A thorough inspection covering engine, transmission, suspension, brakes, body and chassis, electricals, plus a road test and a diagnostics scan. You get a clear verdict to inform your decision.\n\n_Draft copy — pending owner review._',
   30, true, 'Pre-Purchase Car Inspection Nairobi & Kitengela | Platinum Point',
   'Independent pre-purchase and mechanical inspections before you buy a used car. Mobile — we come to the vehicle.'),

  ('mechanical-inspection', 'Mechanical Inspection', 'Inspections',
   'A focused mechanical assessment of a vehicle you already own or are about to sell.',
   E'A structured check of the major systems with notes on condition, wear and anything needing attention.\n\n_Draft copy — pending owner review._',
   40, true, null, null),

  ('vehicle-assessment', 'Vehicle Assessment', 'Inspections',
   'A condition and valuation-support assessment for insurance, sale or fleet purposes.',
   E'An overall assessment of a vehicle''s mechanical and structural condition, documented for your records.\n\n_Draft copy — pending owner review._',
   50, true, null, null),

  ('preventive-maintenance', 'Preventive Maintenance', 'Maintenance',
   'Scheduled servicing to keep your vehicle reliable and avoid expensive failures.',
   E'Oil and filter changes, fluid checks, belts, brakes, suspension and a full health check on a schedule that suits your mileage.\n\n_Draft copy — pending owner review._',
   60, true, null, null),

  ('road-tests', 'Road Tests', 'Diagnostics',
   'A structured road test to reproduce and confirm a fault, or to verify a repair.',
   E'On-road evaluation of drivability, noise, vibration, braking and handling, with findings you can act on.\n\n_Draft copy — pending owner review._',
   70, true, null, null),

  ('engineering-press-lathe', 'Engineering — Press & Lathe', 'Engineering',
   'In-house press and lathe work: bushes, bearings, brake skimming, shafts and more.',
   E'Hydraulic press work for suspension bushes and bearings, lathe work for brake discs and drums, and general machining. Often the quickest route into a proper suspension or brake repair.\n\n_Draft copy — pending owner review._',
   80, true, 'Press & Lathe Engineering in Kitengela | Platinum Point',
   'Hydraulic press and lathe services in Kitengela — bushes, bearings, brake skimming and machining.'),

  ('bodywork-via-partners', 'Bodywork (via trusted partners)', 'Bodywork',
   'Panel, paint and accident repair coordinated through vetted partner workshops.',
   E'We manage bodywork on your behalf through trusted partner shops and keep you as the single point of contact.\n\n_Draft copy — pending owner review._',
   90, true, null, null)
on conflict (slug) do update set
  title = excluded.title, category = excluded.category, summary = excluded.summary,
  description_md = excluded.description_md, display_order = excluded.display_order,
  is_published = excluded.is_published, seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

-- ===========================================================================
-- content_block   [DRAFT copy]
-- ===========================================================================
insert into public.content_block (key, label, "group", value_md) values
  ('home.hero_heading', 'Home — hero heading', 'home', 'Expert automotive engineering, wherever you need it.'),
  ('home.hero_sub', 'Home — hero subheading', 'home',
   'Professional diagnostics, mechanical repairs, vehicle assessments, pre-purchase inspections, preventive maintenance and precision press & lathe services — backed by the experience of a former DT Dobie engineer.'),
  ('home.why_points', 'Home — why choose us (list)', 'home',
   E'- Former **DT Dobie** engineer with experience across many makes\n- We come to you — home, office or roadside\n- In-house **press & lathe** for suspension, bearing and brake work\n- Honest diagnosis before you spend on parts\n- Bodywork handled through trusted partners'),
  ('about.body', 'About — main body', 'about',
   E'Platinum Point Automotive Engineering is run by **Paul Ndirangu Gatama**, a former DT Dobie engineer. After years in a franchise workshop he now operates as a mobile mechanic, bringing dealer-level diagnosis and repair to wherever your vehicle is — backed by an in-house press and lathe for engineering work.\n\n_Draft copy — pending owner detail (§14.2 Q4)._'),
  ('areas.intro', 'Service areas — intro', 'areas',
   'Our home base is Kitengela. We regularly work across Kajiado, Athi River and Nairobi, and can travel anywhere in Kenya by arrangement where transport is facilitated.'),
  ('pricing.explainer', 'Pricing — explainer', 'pricing',
   'Every vehicle and job is different, so we quote per job rather than publish a price list. Tell us what you need through the booking or service-request form and we will come back with a quote.'),
  ('booking.expectation', 'Booking — confirmation expectation', 'booking',
   'Bookings are **requests** — we confirm your time by call or WhatsApp, usually within a few hours. Choose a preferred date and time window and we will come back to you.'),
  ('booking.lead_time_days', 'Booking — minimum lead time (days)', 'booking', '1'),
  ('booking.time_windows', 'Booking — time window options', 'booking',
   E'Morning (9:00–12:00)\nMidday (12:00–15:00)\nAfternoon (15:00–18:00)'),
  ('cta.default', 'Reusable call-to-action', 'general',
   'Need help with your vehicle? Let''s get it assessed.'),
  ('privacy.body', 'Privacy Policy — body', 'legal',
   E'**DRAFT — legal review required (§14.2 Q10).**\n\nPlatinum Point Automotive Engineering collects the contact and vehicle details you submit through this website solely to respond to your enquiry, booking or inspection request, and to provide the services you ask for. We do not sell your data. We retain enquiry records for as long as needed to serve you and for our business records. To ask what we hold about you, or to have it deleted, contact us on the details on the Contact page.\n\nThis draft must be reviewed against the Kenya Data Protection Act, 2019 before launch.')
on conflict (key) do update set
  label = excluded.label, "group" = excluded."group", value_md = excluded.value_md;

-- ===========================================================================
-- testimonial   [PLACEHOLDER — status 'pending' so nothing fake shows publicly]
-- ===========================================================================
insert into public.testimonial (first_name, vehicle_label, rating, comment, consent, source, status, is_featured)
select 'Example', 'Toyota Harrier', 5,
  'Placeholder testimonial — not shown publicly (status = pending). Replace with real, consented testimonials via the Phase 3 admin, or let customers submit them from the site.',
  true, 'seed', 'pending', false
where not exists (select 1 from public.testimonial where source = 'seed');

-- (Owner-role bootstrap moved to migration 20260907100300_bootstrap_owner.sql.)
