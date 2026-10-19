import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Wordmark } from './Wordmark';

describe('<Wordmark />', () => {
  it('renders the lockup and links home', () => {
    render(
      <MemoryRouter>
        <Wordmark />
      </MemoryRouter>,
    );
    expect(screen.getByText('Platinum')).toBeInTheDocument();
    expect(screen.getByText('Motor Services')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
  });
});
