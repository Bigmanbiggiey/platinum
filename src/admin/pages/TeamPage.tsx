import { useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Labeled,
  PageTitle,
  Select,
  Spinner,
} from '../components/ui';
import { useAuth } from '../auth/authContext';
import { InviteLinkPanel } from '../components/InviteLinkPanel';
import {
  useInviteStaff,
  useTeam,
  useUpdateMember,
  type InviteInput,
  type InviteResult,
} from '../lib/team';

export function TeamPage() {
  const { profile } = useAuth();
  const team = useTeam();
  const invite = useInviteStaff();
  const updateMember = useUpdateMember();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<InviteInput['role']>('staff');
  const [result, setResult] = useState<InviteResult | null>(null);

  if (profile?.role !== 'owner') {
    return <EmptyState>Only the owner can manage the team.</EmptyState>;
  }

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    try {
      const r = await invite.mutateAsync({
        email: email.trim(),
        displayName: name.trim(),
        role,
      });
      setResult(r);
      setEmail('');
      setName('');
      setRole('staff');
    } catch {
      /* invite.error is shown below */
    }
  };

  return (
    <section className="space-y-6">
      <PageTitle>Team</PageTitle>

      <Card>
        <h2 className="font-semibold text-[color:var(--color-ink)]">Invite someone</h2>
        <form
          onSubmit={onInvite}
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end"
        >
          <Labeled label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Labeled>
          <Labeled label="Name">
            <Input
              required
              maxLength={80}
              placeholder="Shown in the job activity"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Labeled>
          <Labeled label="Role">
            <Select
              aria-label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as InviteInput['role'])}
            >
              <option value="staff">Staff</option>
              <option value="owner">Owner</option>
            </Select>
          </Labeled>
          <Button variant="accent" type="submit" disabled={invite.isPending}>
            {invite.isPending ? 'Creating…' : 'Create invite'}
          </Button>
        </form>
        {invite.isError && (
          <p className="mt-2 text-sm text-signal">{(invite.error as Error).message}</p>
        )}
        {result && <InviteLinkPanel result={result} />}
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
