import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EnquiryForm } from './EnquiryForm';

function renderForm(variant: 'contact' | 'booking' | 'service' | 'inspection') {
  return render(
    <MemoryRouter>
      <EnquiryForm variant={variant} />
    </MemoryRouter>,
  );
}

describe('<EnquiryForm />', () => {
  it('blocks submit and shows errors when required fields are empty (contact)', async () => {
    const user = userEvent.setup();
    renderForm('contact');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByText(/please tell us your name/i)).toBeInTheDocument();
    expect(screen.getByText(/phone \/ whatsapp number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/what can we help with/i)).toBeInTheDocument();
    expect(screen.getByText(/please tick to consent/i)).toBeInTheDocument();
  });

  it('shows booking-specific fields for the booking variant', () => {
    renderForm('booking');
    expect(screen.getByLabelText(/preferred date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/time window/i)).toBeInTheDocument();
  });

  it('renders a hidden honeypot field', () => {
    renderForm('service');
    expect(screen.getByLabelText(/company website/i)).toBeInTheDocument();
  });
});
