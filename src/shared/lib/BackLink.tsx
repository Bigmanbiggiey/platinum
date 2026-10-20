import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cameFrom } from './navTrail';

/** An in-site "back" link that behaves like the phone's Back button (see above). */
export function BackLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // New tab / window: let the browser handle it.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (cameFrom(location.key) === to.split(/[?#]/)[0]) {
      e.preventDefault();
      navigate(-1);
    }
  };

  return (
    <Link to={to} replace onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
