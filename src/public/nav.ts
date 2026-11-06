/** Where a site link appears: the desktop header, the phone menu, the footer "Site" list. */
export type NavPlace = 'header' | 'menu' | 'footer';

export interface SiteLink {
  to: string;
  label: string;
  /** Longer wording where there is room (the footer). */
  longLabel?: string;
  end?: boolean;
  places: NavPlace[];
}

export const BOOK_LINK = { to: '/book', label: 'Book a service' };

/** The one list of public-site links, in display order. */
const SITE_NAV: SiteLink[] = [
  { to: '/', label: 'Home', end: true, places: ['menu'] },
  { to: '/services', label: 'Services', places: ['header', 'menu', 'footer'] },
  { to: '/portfolio', label: 'Work', places: ['header', 'menu', 'footer'] },
  {
    to: '/service-areas',
    label: 'Areas',
    longLabel: 'Service areas',
    places: ['header', 'menu', 'footer'],
  },
  { to: '/testimonials', label: 'Testimonials', places: ['menu'] },
  { to: '/about', label: 'About', places: ['header', 'menu'] },
  { to: '/contact', label: 'Contact', places: ['header', 'menu'] },
  // The phone menu shows Book as a button after its links (BOOK_LINK), not in the list.
  { ...BOOK_LINK, places: ['footer'] },
  { to: '/privacy', label: 'Privacy policy', places: ['footer'] },
];

export function navFor(place: NavPlace): SiteLink[] {
  return SITE_NAV.filter((l) => l.places.includes(place));
}
