import { Link } from 'react-router-dom';

export function ContentBackLink() {
  return (
    <Link
      to="/admin/content"
      className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
    >
      ← Content
    </Link>
  );
}
