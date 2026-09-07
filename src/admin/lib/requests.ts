import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb, type RequestStatus, type ServiceRequest } from './db';

export interface RequestFilters {
  status?: RequestStatus | 'all';
  type?: string | 'all';
  search?: string;
}

export function useRequests(filters: RequestFilters) {
  return useQuery({
    queryKey: ['requests', filters],
    queryFn: async (): Promise<ServiceRequest[]> => {
      let q = getDb()
        .from('service_request')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.type && filters.type !== 'all') q = q.eq('request_type', filters.type);
      if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        q = q.or(`contact_name.ilike.${s},contact_phone.ilike.${s},area.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['request', id],
    enabled: !!id,
    queryFn: async (): Promise<ServiceRequest | null> => {
      const { data, error } = await getDb()
        .from('service_request')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as ServiceRequest) ?? null;
    },
  });
}

export function useUpdateRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ServiceRequest>) => {
      const { error } = await getDb().from('service_request').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['request', id] });
      void qc.invalidateQueries({ queryKey: ['requests'] });
      void qc.invalidateQueries({ queryKey: ['schedule'] });
      void qc.invalidateQueries({ queryKey: ['count'] });
    },
  });
}

/**
 * Convert an enquiry into a `client` (+ optional `vehicle`) and link it back.
 * Idempotent-ish: if already linked, just returns the existing client_id.
 */
export function useConvertToClient(req: ServiceRequest) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ createVehicle }: { createVehicle: boolean }) => {
      const db = getDb();
      if (req.client_id) return req.client_id;

      const { data: client, error: cErr } = await db
        .from('client')
        .insert({
          name: req.contact_name,
          phone: req.contact_phone,
          whatsapp: req.contact_whatsapp,
          email: req.contact_email,
          area: req.area,
          source: req.source,
        })
        .select('id')
        .single();
      if (cErr) throw cErr;

      let vehicleId: string | null = null;
      if (createVehicle && req.vehicle_description?.trim()) {
        const { data: v, error: vErr } = await db
          .from('vehicle')
          .insert({ client_id: client.id, make: req.vehicle_description.trim().slice(0, 120) })
          .select('id')
          .single();
        if (vErr) throw vErr;
        vehicleId = v.id;
      }

      const { error: linkErr } = await db
        .from('service_request')
        .update({ client_id: client.id, vehicle_id: vehicleId })
        .eq('id', req.id);
      if (linkErr) throw linkErr;
      return client.id as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['request', req.id] });
      void qc.invalidateQueries({ queryKey: ['requests'] });
      void qc.invalidateQueries({ queryKey: ['count'] });
    },
  });
}
