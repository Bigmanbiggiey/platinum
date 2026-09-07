import { useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Labeled,
  PageTitle,
  Spinner,
} from '../components/ui';
import { useAuth } from '../auth/authContext';
import { useInviteStaff, useTeam, useUpdateMember } from '../lib/team';

export function TeamPage() {
  const { profile } = useAuth();
  const team = useTeam();
  const invite = useInviteStaff();
  const updateMember = useUpdateMember();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [link, setLink] = useState<string | null>(null);

  if (profile?.role !== 'owner') {
    return <EmptyState>Only the owner can manage the team.</EmptyState>;
  }

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setLink(null);
    const url = await invite.mutateAsync({
      email: email.trim(),
      displayName: name.trim() || undefined,
    });
    setLink(url);
    setEmail('');
    setName('');
  };

  return (
    <section className="space-y-6">
      <PageTitle>Team</PageTitle>

      <Card>
        <h2 className="font-semibold text-[color:var(--color-ink)]">Invite a staff member</h2>
        <form
          onSubmit={onInvite}
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <Labeled label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Labeled>
          <Labeled label="Name (optional)">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Labeled>
          <Button variant="accent" type="submit" disabled={invite.isPending}>
            {invite.isPending ? 'Creating…' : 'Create invite'}
          </Button>
        </form>
        {invite.isError && (
          <p className="mt-2 text-sm text-signal">{(invite.error as Error).message}</p>
        )}
        {link && (
          <div className="mt-3 rounded border border-teal/40 bg-teal/10 p-3 text-sm">
            <p className="text-[color:var(--color-ink)]">
              Send this one-time link to the staff member — they set their own password:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-slate px-2 py-1 font-mono text-[11px]">
                {link}
              </code>
              <Button onClick={() => void navigator.clipboard?.writeText(link)}>Copy</Button>
            </div>
          </div>
        )}
      </Card>

      {team.isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[color:var(--color-line)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-surface)] text-left font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {team.data!.map((m) => {
                const isSelf = m.user_id === profile?.user_id;
                return (
                  <tr key={m.user_id} className="border-t border-[color:var(--color-line)]">
                    <td className="px-3 py-2 font-mono text-[11px]">{m.email ?? '—'}</td>
                    <td className="px-3 py-2">{m.display_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Badge tone={m.role === 'owner' ? 'attention' : 'neutral'}>{m.role}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {isSelf || m.role === 'owner' ? (
                        <span className="text-steel">{m.is_active ? 'yes' : 'no'}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            updateMember.mutate({
                              userId: m.user_id,
                              patch: { is_active: !m.is_active },
                            })
                          }
                          className="font-mono text-[10px] uppercase tracking-widest text-platinum hover:text-paper"
                        >
                          {m.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
