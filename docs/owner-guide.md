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

- **Dashboard** — the numbers at a glance, and your most recent requests.
- **Notifications** — every new enquiry, booking and testimonial. A number next to it
  means unread. Tap an item to open it; tap **Mark read** when you've dealt with it.
- **Requests** — every enquiry and booking, with filters.
- **Schedule** — bookings waiting for you to confirm a time.
- **Clients** — people and businesses on file, with their vehicles.
- **Website content** — everything the public site shows.
- **Settings** — your business details, hours, and how you're notified.
- **Team** — (owner only) add or remove staff logins.

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

1. **Team → Invite a staff member** → enter their email → **Create invite**.
2. Copy the one-time link and send it to them. They open it and set their own
   password. They can then do everything except manage the team.
3. Use **Deactivate** on the Team list to switch off a login.
