import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Labeled, PageTitle, Textarea } from '../../components/ui';
import { vehicles, type AdminVehicle } from '../../lib/resources';
import { useCreateJob } from '../../lib/jobData';
import { vehicleLabel } from '../../lib/jobs';

/**
 * Staff check-in (D5): vehicle details only — no client, no request. The database
 * only accepts a staff job with client_id and service_request_id both null; the owner
 * links a client later from the job header.
 */
export function WalkInForm() {
  const createVehicle = vehicles.useCreate();
  const createJob = useCreateJob();
  const navigate = useNavigate();
  // A vehicle inserted by a submit whose job insert then failed — reused on retry.
  const createdVehicle = useRef<AdminVehicle | null>(null);

  const [v, setV] = useState({ make: '', model: '', year: '', registration: '' });
  const [complaint, setComplaint] = useState('');
  const [error, setError] = useState<string | null>(null);

  const busy = createJob.isPending || createVehicle.isPending;
  const canCreate = v.make.trim() !== '' && !busy;

  const setField = (k: keyof typeof v) => (e: { target: { value: string } }) => {
    createdVehicle.current = null;
    setV((p) => ({ ...p, [k]: e.target.value }));
  };

  const submit = async () => {
    setError(null);
    try {
      if (!createdVehicle.current) {
        createdVehicle.current = await createVehicle.mutateAsync({
          client_id: null,
          make: v.make.trim(),
          model: v.model.trim() || null,
          year: v.year ? Number(v.year) : null,
          registration: v.registration.trim() || null,
        });
      }
      const vehicle = createdVehicle.current;
      const id = await createJob.mutateAsync({
        vehicle_id: vehicle.id,
        vehicle_label: vehicleLabel(vehicle),
        complaint: complaint.trim() || null,
      });
      navigate(`/admin/jobs/${id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="space-y-4">
      <PageTitle
        actions={
          <Link
            to="/admin/jobs"
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            ← Back
          </Link>
        }
      >
        Check in a walk-in
      </PageTitle>

      <Card className="grid gap-4 sm:grid-cols-4">
        <Labeled label="Make">
          <Input value={v.make} onChange={setField('make')} placeholder="Toyota" />
        </Labeled>
        <Labeled label="Model">
          <Input value={v.model} onChange={setField('model')} placeholder="Fielder" />
        </Labeled>
        <Labeled label="Year">
          <Input type="number" value={v.year} onChange={setField('year')} />
        </Labeled>
        <Labeled label="Registration">
          <Input value={v.registration} onChange={setField('registration')} />
        </Labeled>
      </Card>

      <Card>
        <Labeled
          label="What the customer says is wrong"
          hint="In your words — this can appear on the website later."
        >
          <Textarea
            aria-label="Complaint"
            rows={3}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
          />
        </Labeled>
      </Card>

      {error && <p className="text-sm text-signal">{error}</p>}
      <Button variant="accent" disabled={!canCreate} onClick={submit}>
        {busy ? 'Creating…' : 'Check in vehicle'}
      </Button>
    </section>
  );
}
