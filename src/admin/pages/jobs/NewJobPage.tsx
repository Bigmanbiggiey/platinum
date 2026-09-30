import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Labeled,
  PageTitle,
  Select,
  Spinner,
  Textarea,
} from '../../components/ui';
import { clients, services, vehicles } from '../../lib/resources';
import { useRequest } from '../../lib/requests';
import { useCreateJob, useJobByRequest } from '../../lib/jobData';
import { jobPrefillFromRequest, vehicleLabel } from '../../lib/jobs';

const NEW_VEHICLE = 'new';

/** Start a job — a walk-in, or from a request (`?request=<id>`) with fields prefilled. */
export function NewJobPage() {
  const [params] = useSearchParams();
  const requestId = params.get('request') ?? undefined;
  const request = useRequest(requestId);
  const clientList = clients.useList();
  const vehicleList = vehicles.useList();
  const serviceList = services.useList();
  const createVehicle = vehicles.useCreate();
  const createJob = useCreateJob();
  const existingJob = useJobByRequest(requestId);
  const navigate = useNavigate();
  // A vehicle inserted by a submit whose job insert then failed — reused on retry.
  const createdVehicle = useRef<Awaited<ReturnType<typeof createVehicle.mutateAsync>> | null>(null);

  const [clientId, setClientId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [newVehicle, setNewVehicle] = useState({ make: '', model: '', year: '', registration: '' });
  const [serviceId, setServiceId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);

  // Prefill once the request arrives.
  const req = request.data;
  useEffect(() => {
    if (!req) return;
    setClientId(req.client_id ?? '');
    setVehicleId(req.vehicle_id ?? '');
    setComplaint(req.message ?? '');
  }, [req]);

  const clientVehicles = useMemo(
    () => (vehicleList.data ?? []).filter((v) => v.client_id === clientId),
    [vehicleList.data, clientId],
  );

  if (requestId && request.isLoading) return <Spinner />;

  const busy = createJob.isPending || createVehicle.isPending;
  const vehicleChosen =
    vehicleId === NEW_VEHICLE ? newVehicle.make.trim() !== '' : vehicleId !== '';
  const canCreate = clientId !== '' && vehicleChosen && !busy;

  const submit = async () => {
    setError(null);
    setDuplicateJobId(null);
    try {
      let vehicle = clientVehicles.find((v) => v.id === vehicleId);
      if (vehicleId === NEW_VEHICLE) {
        if (!createdVehicle.current) {
          createdVehicle.current = await createVehicle.mutateAsync({
            client_id: clientId,
            make: newVehicle.make.trim(),
            model: newVehicle.model.trim() || null,
            year: newVehicle.year ? Number(newVehicle.year) : null,
            registration: newVehicle.registration.trim() || null,
          });
        }
        vehicle = createdVehicle.current;
      }
      if (!vehicle) throw new Error('Pick a vehicle.');
      const id = await createJob.mutateAsync({
        ...(req ? jobPrefillFromRequest(req) : {}),
        client_id: clientId,
        vehicle_id: vehicle.id,
        vehicle_label: vehicleLabel(vehicle),
        service_id: serviceId || null,
        complaint: complaint.trim() || null,
      });
      navigate(`/admin/jobs/${id}`, { replace: true });
    } catch (e) {
      if ((e as { code?: string }).code === '23505' && requestId) {
        const found = await existingJob.refetch();
        setDuplicateJobId(found.data?.id ?? null);
        setError('A job already exists for this request.');
        return;
      }
      setError((e as Error).message);
    }
  };

  const setNv = (k: keyof typeof newVehicle) => (e: { target: { value: string } }) => {
    createdVehicle.current = null;
    setNewVehicle((p) => ({ ...p, [k]: e.target.value }));
  };

  return (
    <section className="space-y-4">
      <PageTitle
        actions={
          <Link
            to={requestId ? `/admin/requests/${requestId}` : '/admin/jobs'}
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            ← Back
          </Link>
        }
      >
        {req ? `New job for ${req.contact_name}` : 'New job'}
      </PageTitle>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Client" hint="Not listed? Add them under Clients first.">
          <Select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setVehicleId('');
              createdVehicle.current = null;
            }}
          >
            <option value="">— pick a client —</option>
            {(clientList.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ''}
              </option>
            ))}
          </Select>
        </Labeled>
        <Labeled label="Vehicle">
          <Select
            value={vehicleId}
            disabled={!clientId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">— pick a vehicle —</option>
            {clientVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
                {v.registration ? ` · ${v.registration}` : ''}
              </option>
            ))}
            <option value={NEW_VEHICLE}>+ Add a vehicle</option>
          </Select>
        </Labeled>

        {vehicleId === NEW_VEHICLE && (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
            <Labeled label="Make">
              <Input value={newVehicle.make} onChange={setNv('make')} placeholder="Toyota" />
            </Labeled>
            <Labeled label="Model">
              <Input value={newVehicle.model} onChange={setNv('model')} placeholder="Fielder" />
            </Labeled>
            <Labeled label="Year">
              <Input type="number" value={newVehicle.year} onChange={setNv('year')} />
            </Labeled>
            <Labeled label="Registration">
              <Input value={newVehicle.registration} onChange={setNv('registration')} />
            </Labeled>
          </div>
        )}

        <Labeled label="Service">
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">— none —</option>
            {(serviceList.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Labeled>
      </Card>

      <Card>
        <Labeled
          label="Customer's complaint"
          hint="In your words — this can appear on the website later."
        >
          <Textarea rows={3} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
        </Labeled>
      </Card>

      {error && (
        <p className="text-sm text-signal">
          {error}
          {duplicateJobId && (
            <>
              {' '}
              <Link className="underline" to={`/admin/jobs/${duplicateJobId}`}>
                Open it
              </Link>
            </>
          )}
        </p>
      )}
      <Button variant="accent" disabled={!canCreate} onClick={submit}>
        {busy ? 'Creating…' : 'Check in vehicle'}
      </Button>
    </section>
  );
}
