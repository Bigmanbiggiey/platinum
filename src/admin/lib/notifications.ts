import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';

export interface Notification {
  id: string;
  type: 'request' | 'booking' | 'testimonial';
  title: string;
  body: string | null;
  entity_type: string;
  entity_id: string;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await getDb()
        .from('notification')
        .select('*')
        .order('read_at', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const { count } = await getDb()
        .from('notification')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    one: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await getDb()
          .from('notification')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
    all: useMutation({
      mutationFn: async () => {
        const { error } = await getDb()
          .from('notification')
          .update({ read_at: new Date().toISOString() })
          .is('read_at', null);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
  };
}
