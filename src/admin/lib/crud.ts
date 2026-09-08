import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';

interface HasId {
  id: string;
}

/**
 * A small CRUD hook factory for admin-managed tables. `orderBy` sorts the list;
 * `select` lets a table pull related rows (PostgREST embed syntax).
 */
export function makeResource<T extends HasId>(
  table: string,
  opts: { orderBy?: string; ascending?: boolean; select?: string } = {},
) {
  const select = opts.select ?? '*';
  const listKey = [table, 'list'] as const;

  const useList = (filter?: (rows: T[]) => T[]) =>
    useQuery({
      queryKey: listKey,
      queryFn: async (): Promise<T[]> => {
        let q = getDb().from(table).select(select);
        if (opts.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending ?? true });
        const { data, error } = await q;
        if (error) throw error;
        const rows = (data ?? []) as unknown as T[];
        return filter ? filter(rows) : rows;
      },
    });

  const useOne = (id: string | undefined) =>
    useQuery({
      queryKey: [table, id],
      enabled: !!id,
      queryFn: async (): Promise<T | null> => {
        const { data, error } = await getDb()
          .from(table)
          .select(select)
          .eq('id', id!)
          .maybeSingle();
        if (error) throw error;
        return (data as unknown as T) ?? null;
      },
    });

  function useInvalidate() {
    const qc = useQueryClient();
    return (id?: string) => {
      void qc.invalidateQueries({ queryKey: listKey });
      if (id) void qc.invalidateQueries({ queryKey: [table, id] });
      void qc.invalidateQueries({ queryKey: ['count'] });
    };
  }

  const useCreate = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: async (row: Partial<T>): Promise<T> => {
        const { data, error } = await getDb()
          .from(table)
          .insert(row as never)
          .select(select)
          .single();
        if (error) throw error;
        return data as unknown as T;
      },
      onSuccess: () => invalidate(),
    });
  };

  const useUpdate = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<T> }) => {
        const { error } = await getDb()
          .from(table)
          .update(patch as never)
          .eq('id', id);
        if (error) throw error;
      },
      onSuccess: (_d, v) => invalidate(v.id),
    });
  };

  const useRemove = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await getDb().from(table).delete().eq('id', id);
        if (error) throw error;
      },
      onSuccess: () => invalidate(),
    });
  };

  return { useList, useOne, useCreate, useUpdate, useRemove };
}
