import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Prose } from './Prose';

describe('<Prose />', () => {
  it('renders Markdown as HTML', () => {
    render(<Prose markdown={'## Heading\n\nSome **bold** text.'} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });

  it('is safe with empty input', () => {
    const { container } = render(<Prose markdown={''} />);
    expect(container.querySelector('.prose')).toBeInTheDocument();
  });

  it('strips scripts and inline event handlers (admin-authored content)', () => {
    const { container } = render(
      <Prose markdown={'<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toMatch(/onerror/i);
  });

  it.each([
    '<svg/onload=alert(1)>',
    '<img/src/onerror=alert(1)>',
    '<img src=x onerror=alert(1)>',
    '<a href="jav&#97;script:alert(1)">x</a>',
    '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>',
    '<math><mtext><a href="javascript:alert(1)">x</a></mtext></math>',
    '<details open ontoggle=alert(1)>x</details>',
  ])('neutralises %s (payloads that bypass a regex filter)', (payload) => {
    const { container } = render(<Prose markdown={payload} />);

    // No dangerous elements survived as real DOM nodes.
    expect(container.querySelector('script, iframe, svg, math, object, embed')).toBeNull();

    // No inline event-handler attribute on any surviving element.
    for (const el of container.querySelectorAll('*')) {
      for (const name of el.getAttributeNames()) {
        expect(name.toLowerCase().startsWith('on')).toBe(false);
      }
    }

    // No javascript: URL survived on a link or resource.
    for (const el of container.querySelectorAll('a[href], [src]')) {
      const v = (el.getAttribute('href') ?? el.getAttribute('src') ?? '')
        .replace(/\s/g, '')
        .toLowerCase();
      expect(v.startsWith('javascript:')).toBe(false);
    }
  });
});
