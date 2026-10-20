import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequestsPage } from './RequestsPage';

const rows = [
  {
    id: 'r1',
    created_at: '2026-10-20T08:00:00Z',
    contact_name: 'Wanjiru Kamau',
    contact_phone: '+254711000001',
    request_type: 'booking',
    area: 'Syokimau',
    status: 'new',
  },
  {
    id: 'r2',
    created_at: '2026-10-19T08:00:00Z',
    contact_name: 'Otieno Odhiambo',
    contact_phone: '+254711000002',
    request_type: 'inspection',
    area: null,
    status: 'contacted',
  },
];
vi.mock('../lib/requests', () => ({ useRequests: () => ({ isLoading: false, data: rows }) }));

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RequestsPage />
    </MemoryRouter>,
  );
}

describe('<RequestsPage />', () => {
  it('on phones shows one card per request; the whole card opens it', () => {
    renderPage();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    const first = within(cards[0]).getByRole('link');
    expect(first).toHaveAttribute('href', '/admin/requests/r1');
    expect(first).toHaveTextContent('Wanjiru Kamau');
    expect(first).toHaveTextContent('new');
    expect(first).toHaveTextContent('Syokimau');
    expect(first).toHaveTextContent('+254711000001');
    // The list is the phone layout only.
    expect(cards[0].parentElement!.className).toMatch(/\bmd:hidden\b/);
  });

  it('from 768 px shows a table whose header is not trapped inside a scroll box', () => {
    renderPage();
    const table = screen.getByRole('table');
    expect(table.className).toMatch(/\bhidden\b.*\bmd:table\b/);
    // The bug: an overflow-x-auto wrapper made the sticky header stick inside the table.
    expect(table.closest('.overflow-x-auto')).toBeNull();
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['When', 'Name', 'Phone', 'Type', 'Area', 'Status']);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByRole('link', { name: 'Otieno Odhiambo' })).toHaveAttribute(
      'href',
      '/admin/requests/r2',
    );
  });
});
