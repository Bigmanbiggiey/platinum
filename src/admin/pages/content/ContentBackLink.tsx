import { BackLink } from '../../../shared/lib/BackLink';

export function ContentBackLink() {
  return (
    <BackLink
      to="/admin/content"
      className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
    >
      ← Content
    </BackLink>
  );
}
