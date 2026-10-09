import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EnquiryForm } from './EnquiryForm';

// Render straight into the "submitted" state.
vi.mock('./useSubmit', () => ({
  useSubmit: () => ({ status: 'ok', error: null, submit: vi.fn() }),
}));

describe('<EnquiryForm /> confirmation', () => {
  it('shows the default note with a real apostrophe, not an HTML entity', () => {
    const { container } = render(
      <MemoryRouter>
        <EnquiryForm variant="contact" />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('We’ll get back to you by call or WhatsApp, usually within a few hours.'),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/&[a-z]+;/);
  });
});
