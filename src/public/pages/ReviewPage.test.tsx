import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const CODE = 'A'.repeat(40) + '_-9';

const { rpc, submit, sub } = vi.hoisted(() => ({
  rpc: vi.fn(),
  submit: vi.fn(async () => true),
  sub: { status: 'idle' as string },
}));

vi.mock('../../shared/supabase/client', () => ({ getSupabaseClient: () => ({ rpc }) }));
vi.mock('../forms/useSubmit', () => ({
  useSubmit: () => ({ status: sub.status, error: null, submit }),
}));
vi.mock('../components/ui/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('../forms/Turnstile', () => ({ Turnstile: () => null }));

import { ReviewPage, reviewCode } from './ReviewPage';

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(
    <MemoryRouter>
      <ReviewPage />
    </MemoryRouter>,
  );
};

beforeEach(() => {
  rpc.mockReset();
  submit.mockClear();
  sub.status = 'idle';
});

describe('reviewCode', () => {
  it('reads a well-formed code only', () => {
    expect(reviewCode(`/review/${CODE}`)).toBe(CODE);
    expect(reviewCode('/review')).toBeNull();
    expect(reviewCode('/review/short')).toBeNull();
    expect(reviewCode(`/review/${CODE}x`)).toBeNull();
  });
});

describe('<ReviewPage />', () => {
  it('a missing or bad code reads as an invalid link, without asking the server', async () => {
    renderAt('/review/nope');
    expect(await screen.findByText(/no longer valid/)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('an unknown, expired or used code reads the same', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    renderAt(`/review/${CODE}`);
    expect(await screen.findByText(/no longer valid/)).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('review_invite_summary', { token: CODE });
  });

  it('a live link names the vehicle and sends the review', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          vehicle_label: '2014 Toyota Fielder',
          service_title: 'Brake overhaul',
          completed_at: '2026-09-12T10:00:00Z',
        },
      ],
      error: null,
    });
    renderAt(`/review/${CODE}`);
    expect(await screen.findByText('2014 Toyota Fielder')).toBeInTheDocument();
    expect(screen.getByText(/Brake overhaul, completed 12 Sept? 2026/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send review' }));
    expect(screen.getByText('First name, please.')).toBeInTheDocument();
    expect(screen.getByText('Pick a rating.')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Amina' } });
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    fireEvent.change(screen.getByLabelText(/Your comment/), { target: { value: 'Silent brakes' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Send review' }));
    expect(submit).toHaveBeenCalledWith(
      'review',
      { token: CODE, first_name: 'Amina', rating: 5, comment: 'Silent brakes', consent: true },
      expect.objectContaining({ hp: '' }),
    );
  });

  it('a link used meanwhile shows the invalid message after submit', async () => {
    rpc.mockResolvedValue({
      data: [{ vehicle_label: 'Mazda Demio', service_title: null, completed_at: null }],
      error: null,
    });
    sub.status = 'invalid-link';
    renderAt(`/review/${CODE}`);
    expect(await screen.findByText(/no longer valid/)).toBeInTheDocument();
  });
});
