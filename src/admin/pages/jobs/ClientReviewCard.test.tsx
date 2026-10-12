import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { JobWithRefs } from '../../lib/jobs';

const { state } = vi.hoisted(() => ({
  state: {
    invite: null as null | Record<string, string | null>,
    client: { name: 'Amina Wanjiku', phone: '0722 322 870', whatsapp: null } as null | {
      name: string;
      phone: string | null;
      whatsapp: string | null;
    },
    create: vi.fn(async () => 'CODE123'),
    add: vi.fn(),
  },
}));

vi.mock('../../lib/resources', () => ({
  clients: { useOne: () => ({ data: state.client }) },
}));
vi.mock('../../lib/reviews', async (orig) => ({
  ...(await orig<typeof import('../../lib/reviews')>()),
  useLatestReviewInvite: () => ({ data: state.invite }),
  useJobTestimonials: () => ({ data: [] }),
  useCreateReviewInvite: () => ({ mutateAsync: state.create, isPending: false, isError: false }),
  useAddOwnerTestimonial: () => ({ mutate: state.add, isPending: false, isError: false }),
}));

import { ClientReviewCard } from './ClientReviewCard';

const job = {
  id: 'j1',
  client_id: 'c1',
  vehicle_label: '2014 Toyota Fielder',
  status: 'completed',
  public_consent: true,
  client: { name: 'Amina Wanjiku' },
} as unknown as JobWithRefs;

const renderCard = (j = job) =>
  render(
    <MemoryRouter>
      <ClientReviewCard job={j} />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.invite = null;
  state.client = { name: 'Amina Wanjiku', phone: '0722 322 870', whatsapp: null };
  state.create.mockClear();
  state.add.mockClear();
});

describe('<ClientReviewCard />', () => {
  it('makes a link and shows it once, with WhatsApp to the client', async () => {
    renderCard();
    expect(screen.getByText('No review link yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Get review link' }));
    expect(await screen.findByText(/\/review\/CODE123$/)).toBeInTheDocument();
    const wa = screen.getByRole('link', { name: 'Send on WhatsApp' });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/254722322870\?text=Hi%20Amina/);
    expect(screen.queryByRole('button', { name: /review link/ })).not.toBeInTheDocument();
  });

  it('offers copy only when the client has no number', async () => {
    state.client = { name: 'Amina', phone: null, whatsapp: null };
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Get review link' }));
    expect(await screen.findByText(/No phone number on the client/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Send on WhatsApp' })).not.toBeInTheDocument();
  });

  it('warns before replacing a live link', async () => {
    state.invite = {
      id: 'i1',
      created_at: '2026-10-01T00:00:00Z',
      expires_at: '2999-01-01T00:00:00Z',
      used_at: null,
    };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'New review link' }));
    expect(confirm).toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('adds a testimonial on the client’s behalf, first name prefilled', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /on the client’s behalf/ }));
    expect(screen.getByLabelText('Client’s first name')).toHaveValue('Amina');
    fireEvent.change(screen.getByLabelText('What the client said'), {
      target: { value: 'Very happy' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add testimonial' }));
    expect(state.add).toHaveBeenCalledWith(
      { firstName: 'Amina', vehicleLabel: '2014 Toyota Fielder', rating: 5, comment: 'Very happy' },
      expect.anything(),
    );
  });

  it('needs the client’s consent before adding a testimonial', () => {
    renderCard({ ...job, public_consent: false } as JobWithRefs);
    expect(
      screen.queryByRole('button', { name: /on the client’s behalf/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/must first agree/)).toBeInTheDocument();
  });
});
