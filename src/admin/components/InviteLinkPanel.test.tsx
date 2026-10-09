import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteLinkPanel } from './InviteLinkPanel';
import type { InviteResult } from '../lib/team';

const result: InviteResult = {
  inviteUrl: 'https://platinum-point.vercel.app/admin/accept-invite?token_hash=abc&type=invite',
  email: 'kevin@example.com',
  displayName: 'Kevin',
  role: 'staff',
  existed: false,
};

describe('<InviteLinkPanel />', () => {
  it('shows the link with WhatsApp and email share links', () => {
    render(<InviteLinkPanel result={result} />);
    expect(screen.getByText(result.inviteUrl)).toBeInTheDocument();
    const wa = screen.getByRole('link', { name: /whatsapp/i });
    expect(wa).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/\?text=/));
    expect(wa).toHaveAttribute('target', '_blank');
    const email = screen.getByRole('link', { name: /email/i });
    expect(email).toHaveAttribute('href', expect.stringMatching(/^mailto:kevin@example\.com\?/));
    expect(screen.getByText(/expires/i)).toBeInTheDocument();
  });

  it('copies the link', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<InviteLinkPanel result={result} />);
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(result.inviteUrl);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('explains a re-invite of an existing account', () => {
    render(<InviteLinkPanel result={{ ...result, existed: true }} />);
    expect(screen.getByText(/already had an account/i)).toBeInTheDocument();
  });
});
