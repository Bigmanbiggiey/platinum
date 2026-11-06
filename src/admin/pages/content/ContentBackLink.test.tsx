import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContentBackLink } from './ContentBackLink';

const renderLink = (ui: React.ReactElement) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>,
  );

describe('<ContentBackLink />', () => {
  it('goes to the content hub by default', () => {
    renderLink(<ContentBackLink />);
    expect(screen.getByRole('link', { name: '← Content' })).toHaveAttribute(
      'href',
      '/admin/content',
    );
  });

  it('lets an edit page point it at its list', () => {
    renderLink(<ContentBackLink to="/admin/content/services" label="Services" />);
    expect(screen.getByRole('link', { name: '← Services' })).toHaveAttribute(
      'href',
      '/admin/content/services',
    );
  });
});
