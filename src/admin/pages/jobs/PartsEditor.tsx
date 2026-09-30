import { useState } from 'react';
import { Button, Input } from '../../components/ui';
import { formatKes, type JobPart } from '../../lib/jobs';

export interface NewPart {
  name: string;
  quantity: number;
  cost_kes: number | null;
}

/** Parts used for one fix. Only names ever go public (J2); quantity + cost stay private. */
export function PartsEditor({
  parts,
  onAdd,
  onRemove,
  busy = false,
}: {
  parts: JobPart[];
  onAdd: (p: NewPart) => void;
  onRemove: (id: string) => void;
  busy?: boolean;
}) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const canAdd = name.trim() !== '' && Number(qty) > 0 && !busy;

  const add = () => {
    onAdd({
      name: name.trim(),
      quantity: Number(qty),
      cost_kes: cost.trim() === '' ? null : Math.round(Number(cost)),
    });
    setName('');
    setQty('1');
    setCost('');
  };

  return (
    <div className="space-y-2">
      {parts.length > 0 && (
        <ul className="divide-y divide-[color:var(--color-line)] text-sm">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-1.5">
              <span className="flex-1 text-[color:var(--color-ink)]">{p.name}</span>
              <span className="font-mono text-xs text-steel">×{p.quantity}</span>
              <span className="w-24 text-right font-mono text-xs text-steel">
                {p.cost_kes != null ? formatKes(p.cost_kes) : '—'}
              </span>
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => onRemove(p.id)}
                className="font-mono text-[10px] text-signal"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
        <Input
          aria-label="Part name"
          placeholder="Part, e.g. front brake pads"
          className="col-span-2 sm:col-span-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          aria-label="Quantity"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Input
          aria-label="Cost (KES)"
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="KES"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <Button
          aria-label="Add part"
          className="col-span-2 sm:col-span-1"
          disabled={!canAdd}
          onClick={add}
        >
          Add
        </Button>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        Only part names can appear on the website. Quantity and cost stay private.
      </p>
    </div>
  );
}
