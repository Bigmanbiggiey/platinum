# Platinum Point admin — how to use it

A short guide for running the website and enquiries from the admin panel.

## Signing in

- Go to **your-site-address/admin** (currently `platinum-point.vercel.app/admin`).
- Sign in with your email and password. Tap **Show** to check the password as you type.
- Forgot it? Use **Forgot password?** — you'll get a reset link by email.

The admin works on a phone. It's dark on purpose and never appears in Google.

## Getting around

The top bar has a **☰ menu button** (left), the Platinum Point mark, and on the right
**View site ↗**, your name, and **Sign out**. Tap **☰** to show or hide the side menu;
it remembers your choice. On a phone the menu slides in over the page.

The side menu:

- **Dashboard** — the numbers at a glance, **recent job activity** (who did what on
  which job, e.g. "Kevin · staff — added 2 after photos"), and your most recent requests.
- **Notifications** — every new enquiry, booking and testimonial. A number next to it
  means unread. Tap an item to open it; tap **Mark read** when you've dealt with it.
- **Requests** — every enquiry and booking, with filters.
- **Schedule** — bookings waiting for you to confirm a time.
- **Clients** — people and businesses on file, with their vehicles.
- **Website content** — everything the public site shows.
- **Settings** — your business details, hours, and how you're notified.
- **Team** — (owner only) add or remove staff logins.

**What staff can do:** staff see only **Jobs** and **Schedule** (booked jobs). They can
check in a walk-in from the vehicle details, record diagnosis, repairs, photos, parts
(no prices), labour hours, and complete or re-open a job. They never see clients,
phone numbers, requests, costs, website content or settings, and they can't cancel or
delete a job. A walk-in they check in shows **"Walk-in — no client yet"** on the job —
pick the client there and tap **Link**.

## Handling an enquiry

1. Open it from **Notifications** or **Requests**.
2. Call or WhatsApp the customer (their number is shown, tap to dial).
3. Move the **Status** along as things progress:
   `new → contacted → scheduled → completed → closed`. Use **spam** or **archived**
   to hide junk.
4. If it's a real customer, tap **Convert to client + vehicle** — it creates their
   record and links this request to it.
5. Jot anything useful in **Internal notes**; put the result in **Outcome** when done.

## Confirming a booking

1. Go to **Schedule**.
2. Adjust the **Date** if needed, then tap **Confirm** — this sets the time and marks
   it scheduled. Tap **Decline** if you can't make it.
3. If email is set up, the customer is emailed automatically. If not, you'll see a
   note reminding you to tell them by call or WhatsApp.

## Recording a job

**Jobs** in the menu is where you log each car you work on, from arrival to hand-back.

1. **Start the job.** From a request: open it, **Convert to client** if you haven't, then
   **Start job**. For a walk-in: **Jobs → New job**, pick the client and vehicle (or
   **+ Add a vehicle**). Each job gets a number like `PP-2026-0042`.
2. **Check-in tab.** Odometer, the customer's complaint in your words, and photos of the
   car as it arrived. Tick **Client agrees to this job being shown on our website** only
   if they said yes.
3. **Diagnosis tab.** Add each problem you find, explain it, and add **before** photos.
4. **Repair tab.** For each problem: what you did, the outcome (**Fixed**, **Deferred** if
   the client chose not to fix it now, or **Not fixed**), **after** photos and the parts
   you used.
5. **Wrap-up tab.** Labour hours and cost, then **Mark completed**. If the job came from a
   request, that request is marked completed too.

Photos: tap **Hide from website** on any photo that shows a number plate, a face or a
home. Location data is removed from every photo automatically when you upload it.

Private — never on the website: the client's name and phone, number plate, odometer,
labour, part quantities and costs, and internal notes.

Jobs don't appear on the website yet — publishing is the next update.

**Who did what:** every job has an **Activity** tab listing each check-in, status
change, problem, photo, part, labour and consent change with the name of the person
who made it and when. Several photos uploaded together show as one line ("added 3
after photos"). Prices are never shown there, so staff can see it too.

## Editing the website

Everything under **Website content**:

- **Services** — your list of services. Each has a **Published** switch (draft services
  don't show on the site). Write the description in the box; tap **Preview** to see how
  it will look.
- **Portfolio** — write-ups of jobs you've done. Add a **Cover image** and a
  **Gallery** from the Media library. Publish when ready.
- **Testimonials** — customer feedback submitted from the site. Tap **Approve** to
  show it publicly (only the first name + vehicle + comment appear), **Feature** to
  pin it to the top, or **Reject**.
- **Media library** — upload photos here first (always add **alt text** describing the
  image), then attach them to a service or portfolio entry.
- **Page copy** — the editable text on the home and about pages.
- **Service areas** / **Partners** — the lists shown on the site.

**Publishing:** after you save a content change the site rebuilds itself. You'll see
"your changes will be live in ~1–2 minutes". (If that message says auto-publish isn't
switched on yet, ask the developer to add the deploy hook.)

## Settings

- **Business details, hours, contact** — shown across the site and in Google's
  structured data.
- **Enquiry notification** — choose **Email** (you get a message per enquiry) or
  **Dashboard only**, and set the address it goes to.
- **Social links** — a small JSON box; leave it as-is unless you're adding a profile.

## Adding a staff member (owner only)

1. **Team → Invite someone** → enter their **email** and **name** (the name is what the
   job activity shows), pick **Staff** (jobs & schedule only) or **Owner** (everything) → **Create invite**.
2. Send the link with **Share on WhatsApp**, **Email** (opens your own email app) or
   **Copy link**. They open it, choose a password and are straight in — the invite is
   your approval.
3. The link works once and expires after 24 hours. If it expires, create the invite
   again for a fresh link. Inviting an email that already has an account gives them a
   "set a new password" link instead.
4. Use **Deactivate** on the Team list to switch off a login.
