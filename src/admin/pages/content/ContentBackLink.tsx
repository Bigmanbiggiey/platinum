import { BackLink } from '../../../shared/lib/BackLink';

/** "← Content" on the content list pages; edit pages point it at their list instead. */
export function ContentBackLink({
  to = '/admin/content',
  label = 'Content',
}: {
  to?: string;
  label?: string;
}) {
  return (
    <BackLink
      to={to}
      className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
    >
      ← {label}
    </BackLink>
  );
}
