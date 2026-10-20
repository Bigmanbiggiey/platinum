import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, EmptyState, PageTitle, Select, Input, Spinner } from '../components/ui';
import { useRequests, type RequestFilters } from '../lib/requests';
import { REQUEST_TYPES, STATUSES, prettyType, statusTone } from '../lib/db';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { dateStyle: 'medium' });

export function RequestsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RequestFilters>({
    status: 'all',
    type: 'all',
    search: '',
  });
  const q = useRequests(filters);

  return (
    <section>
      <PageTitle>Requests</PageTitle>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          placeholder="Search name, phone or area…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <Select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as never }))}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="all">All types</option>
          {REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>
              {prettyType(t)}
            </option>
          ))}
        </Select>
      </div>

      {q.isLoading ? (
        <Spinner />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState>No requests match.</EmptyState>
      ) : (
        <>
          {/* Phones: one card per request — the whole card opens it. */}
          <ul className="space-y-2 md:hidden">
            {q.data!.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/admin/requests/${r.id}`}
                  className="block rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 hover:border-signal"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-semibold text-[color:var(--color-ink)]">
                      {r.contact_name}
                    </span>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </span>
                  <span className="mt-1 block text-sm text-[color:var(--color-muted)]">
                    {prettyType(r.request_type)}
                    {r.area ? ` · ${r.area}` : ''}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-[color:var(--color-muted)]">
                    <span>{when(r.created_at)}</span>
                    <span>{r.contact_phone}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* From 768 px: a table. No overflow wrapper, so the header sticks under the
              admin top bar instead of inside the table (which hid the first row). */}
          <table className="hidden w-full border-separate border-spacing-0 rounded-lg border border-[color:var(--color-line)] text-sm md:table">
            <thead className="sticky top-16 z-10 text-left">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                {['When', 'Name', 'Phone', 'Type', 'Area', 'Status'].map((h, i, all) => (
                  <th
                    key={h}
                    scope="col"
                    className={`border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 font-medium ${
                      i === 0 ? 'rounded-tl-lg' : ''
                    } ${i === all.length - 1 ? 'rounded-tr-lg' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data!.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/admin/requests/${r.id}`)}
                  className="cursor-pointer hover:bg-[color:var(--color-surface)] [&:not(:last-child)>td]:border-b [&>td]:border-[color:var(--color-line)]"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[color:var(--color-muted)]">
                    {when(r.created_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/admin/requests/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {r.contact_name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]">
                    {r.contact_phone}
                  </td>
                  <td className="px-3 py-2.5">{prettyType(r.request_type)}</td>
                  <td className="px-3 py-2.5 text-[color:var(--color-muted)]">{r.area ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
