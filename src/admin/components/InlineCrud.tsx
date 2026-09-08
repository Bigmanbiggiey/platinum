import { useState, type ReactNode } from 'react';
import { Button, Card, EmptyState, Input, Label, Select, Spinner } from './ui';
import { usePublish } from '../lib/rebuild';

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'checkbox' | 'select';
  options?: string[];
  width?: string;
}

interface Row {
  id: string;
}

interface Resource<T extends Row> {
  useList: () => { data?: T[]; isLoading: boolean };
  useCreate: () => { mutateAsync: (row: Partial<T>) => Promise<unknown>; isPending: boolean };
  useUpdate: () => {
    mutateAsync: (v: { id: string; patch: Partial<T> }) => Promise<unknown>;
    isPending: boolean;
  };
  useRemove: () => { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean };
}

/** Generic list + add-row + per-row edit/delete for small content tables. */
export function InlineCrud<T extends Row>({
  resource,
  fields,
  blank,
  publishOnChange = true,
}: {
  resource: Resource<T>;
  fields: FieldDef[];
  blank: Partial<T>;
  publishOnChange?: boolean;
}) {
  const list = resource.useList();
  const create = resource.useCreate();
  const update = resource.useUpdate();
  const remove = resource.useRemove();
  const publish = usePublish();
  const [draft, setDraft] = useState<Partial<T>>(blank);

  const bump = () => publishOnChange && publish.trigger();

  const renderInput = (f: FieldDef, value: unknown, onChange: (v: unknown) => void) => {
    if (f.type === 'checkbox') {
      return (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      );
    }
    if (f.type === 'select') {
      return (
        <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    }
    return (
      <Input
        type={f.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => onChange(f.type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    );
  };

  if (list.isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-2 font-semibold text-[color:var(--color-ink)]">Add</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <Label>{f.label}</Label>
              {renderInput(f, (draft as Record<string, unknown>)[f.key], (v) =>
                setDraft((d) => ({ ...d, [f.key]: v }) as Partial<T>),
              )}
            </label>
          ))}
        </div>
        <Button
          className="mt-3"
          variant="accent"
          disabled={create.isPending}
          onClick={async () => {
            await create.mutateAsync(draft);
            setDraft(blank);
            bump();
          }}
        >
          Add
        </Button>
      </Card>

      {(list.data ?? []).length === 0 ? (
        <EmptyState>Nothing yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {list.data!.map((row) => (
            <EditableRow
              key={row.id}
              row={row}
              fields={fields}
              renderInput={renderInput}
              onSave={async (patch) => {
                await update.mutateAsync({ id: row.id, patch });
                bump();
              }}
              onDelete={async () => {
                if (confirm('Delete this row?')) {
                  await remove.mutateAsync(row.id);
                  bump();
                }
              }}
              busy={update.isPending || remove.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EditableRow<T extends Row>({
  row,
  fields,
  renderInput,
  onSave,
  onDelete,
  busy,
}: {
  row: T;
  fields: FieldDef[];
  renderInput: (f: FieldDef, v: unknown, onChange: (v: unknown) => void) => ReactNode;
  onSave: (patch: Partial<T>) => Promise<void>;
  onDelete: () => Promise<void>;
  busy: boolean;
}) {
  const [patch, setPatch] = useState<Partial<T>>({});
  const merged = { ...row, ...patch };
  const dirty = Object.keys(patch).length > 0;
  return (
    <Card>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <Label>{f.label}</Label>
            {renderInput(f, (merged as Record<string, unknown>)[f.key], (v) =>
              setPatch((p) => ({ ...p, [f.key]: v }) as Partial<T>),
            )}
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="accent"
          disabled={!dirty || busy}
          onClick={async () => {
            await onSave(patch);
            setPatch({});
          }}
        >
          Save
        </Button>
        <Button variant="danger" disabled={busy} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
