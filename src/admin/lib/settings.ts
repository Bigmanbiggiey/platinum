import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import type { AdminSiteSettings } from './resources';

export function useSettings() {
  return useQuery({
    queryKey: ['site_settings'],
    queryFn: async (): Promise<AdminSiteSettings | null> => {
      const { data, error } = await getDb().from('site_settings').select('*').maybeSingle();
      if (error) throw error;
      return (data as AdminSiteSettings) ?? null;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AdminSiteSettings>) => {
      const { error } = await getDb().from('site_settings').update(patch).eq('id', true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site_settings'] }),
  });
}
