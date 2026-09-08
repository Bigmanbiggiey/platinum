import { useState } from 'react';
import { Label } from './ui';
import { Prose } from '../../public/components/ui/Prose';

/** Markdown textarea with a preview toggle (reuses the public <Prose> renderer). */
export function MarkdownField({
  label,
  value,
  onChange,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="font-mono text-[10px] uppercase tracking-widest text-platinum hover:text-paper"
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div className="mt-1 min-h-[6rem] rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-ground)] p-3">
          <Prose markdown={value || '_(empty)_'} />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-ground)] px-3 py-2 font-mono text-[13px] text-[color:var(--color-ink)] outline-none focus:border-signal"
        />
      )}
    </div>
  );
}
