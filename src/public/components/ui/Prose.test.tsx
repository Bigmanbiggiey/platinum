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
});
