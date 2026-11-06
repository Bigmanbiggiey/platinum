import { Link } from 'react-router-dom';
import { EmptyState, PageTitle } from '../components/ui';

/** Unknown `/admin/*` path, inside the shell so the nav is still there. */
export function NotFoundPage() {
  return (
    <section>
      <PageTitle>Page not found</PageTitle>
      <EmptyState>
        This admin page doesn’t exist.{' '}
        {/* `/admin` lands each role on its home: the Dashboard, or Jobs for staff. */}
        <Link
          to="/admin"
          className="font-semibold text-[color:var(--color-ink)] underline underline-offset-2"
        >
          Go to the start page
        </Link>
      </EmptyState>
    </section>
  );
}
