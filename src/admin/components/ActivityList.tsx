import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from './ui';
import {
  actorLabel,
  describeActivity,
  timeAgo,
  type JobActivity,
  type JobActivityWithJob,
} from '../lib/activity';

type Item = JobActivity & { job?: JobActivityWithJob['job'] };

const row = 'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2.5 text-sm';

/**
 * "Kevin · staff — added 2 after photos · PP-2026-0042 · 2014 Toyota Fielder · 10 min ago".
 * `showJob` (dashboard feed) adds the job reference and links each entry to its job.
 */
export function ActivityList({
  items,
  showJob = false,
  now,
}: {
  items: Item[];
  showJob?: boolean;
  now?: Date;
}) {
  if (items.length === 0) return <EmptyState>No activity yet.</EmptyState>;
  return (
    <ul className="divide-y divide-[color:var(--color-line)]">
      {items.map((a) => {
        const body: ReactNode = (
          <>
            <span className="font-semibold text-[color:var(--color-ink)]">{actorLabel(a)}</span>
            <span className="text-[color:var(--color-muted)]">— {describeActivity(a)}</span>
            {showJob && a.job && (
              <span className="font-mono text-xs text-steel">
                · {a.job.job_number} · {a.job.vehicle_label}
              </span>
            )}
            <span className="ml-auto font-mono text-[10px] text-steel">
              {timeAgo(a.created_at, now)}
            </span>
          </>
        );
        return (
          <li key={a.id}>
            {showJob ? (
              <Link
                to={`/admin/jobs/${a.job_id}`}
                className={`${row} hover:bg-[color:var(--color-ground)]`}
              >
                {body}
              </Link>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
