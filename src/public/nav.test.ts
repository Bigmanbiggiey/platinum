import { describe, it, expect } from 'vitest';
import { navFor } from './nav';

describe('public navFor', () => {
  it('gives the desktop header the five main pages', () => {
    expect(navFor('header').map((l) => l.label)).toEqual([
      'Services',
      'Work',
      'Areas',
      'About',
      'Contact',
    ]);
  });
  it('gives the phone menu Home and Testimonials as well', () => {
    expect(navFor('menu').map((l) => l.to)).toEqual([
      '/',
      '/services',
      '/portfolio',
      '/service-areas',
      '/testimonials',
      '/about',
      '/contact',
    ]);
  });
  it('gives the footer its links, with the long wording where set', () => {
    expect(navFor('footer').map((l) => l.longLabel ?? l.label)).toEqual([
      'Services',
      'Work',
      'Service areas',
      'Book a service',
      'Privacy policy',
    ]);
  });
  it('only marks Home as an exact match', () => {
    expect(
      navFor('menu')
        .filter((l) => l.end)
        .map((l) => l.to),
    ).toEqual(['/']);
  });
});
