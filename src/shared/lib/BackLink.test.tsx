import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { BackLink } from './BackLink';
import { useNavTrail } from './navTrail';

/** The phone's Back button. */
function PhoneBack() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Phone back</button>;
}

function Shell() {
  useNavTrail();
  return (
    <Routes>
      <Route path="/start" element={<p>Start page</p>} />
      <Route
        path="/list"
        element={
          <>
            <p>List page</p>
            <Link to="/detail">Open detail</Link>
          </>
        }
      />
      <Route
        path="/detail"
        element={
          <>
            <p>Detail page</p>
            <BackLink to="/list">← All items</BackLink>
          </>
        }
      />
    </Routes>
  );
}

function renderAt(entries: string[]) {
  return render(
    <MemoryRouter
      initialEntries={entries}
      initialIndex={entries.length - 1}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Shell />
      <PhoneBack />
    </MemoryRouter>,
  );
}

describe('<BackLink />', () => {
  beforeEach(() => sessionStorage.clear());

  it('goes back one step when it leads to the page you came from, so phone Back does not undo it', async () => {
    renderAt(['/start', '/list']);
    await userEvent.click(screen.getByRole('link', { name: 'Open detail' }));
    expect(screen.getByText('Detail page')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: '← All items' }));
    expect(screen.getByText('List page')).toBeInTheDocument();

    // Before the fix this returned to the detail page ("undo").
    await userEvent.click(screen.getByRole('button', { name: 'Phone back' }));
    expect(screen.getByText('Start page')).toBeInTheDocument();
  });

  it('replaces the page when opened directly, so phone Back skips it', async () => {
    renderAt(['/start', '/detail']);
    await userEvent.click(screen.getByRole('link', { name: '← All items' }));
    expect(screen.getByText('List page')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Phone back' }));
    expect(screen.getByText('Start page')).toBeInTheDocument();
  });

  it('is a real link to the parent page', () => {
    renderAt(['/detail']);
    expect(screen.getByRole('link', { name: '← All items' })).toHaveAttribute('href', '/list');
  });
});
