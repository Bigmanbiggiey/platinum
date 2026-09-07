import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, PageTitle, Select, Input, Spinner } from '../components/ui';
import { useRequests, type RequestFilters } from '../lib/requests';
import { REQUEST_TYPES, STATUSES, prettyType, statusTone } from '../lib/db';

export function RequestsPage() {
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
        <div className="overflow-x-auto rounded-lg border border-[color:var(--color-line)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-surface)] text-left">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {q.data!.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-[color:var(--color-line)] hover:bg-[color:var(--color-surface)]"
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-steel">
                    {new Date(r.created_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/admin/requests/${r.id}`}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {r.contact_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.contact_phone}</td>
                  <td className="px-3 py-2">{prettyType(r.request_type)}</td>
                  <td className="px-3 py-2 text-[color:var(--color-muted)]">{r.area ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
