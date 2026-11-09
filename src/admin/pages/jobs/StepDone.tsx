import { useState } from 'react';
import { Button, Card } from '../../components/ui';
import { nextStep, type StepKey } from '../../lib/jobFlow';
import { useStepFlow } from './stepFlow';

/**
 * "Done — <next step>" at the end of a step. `beforeFinish` saves the step's own form
 * first; `saved` names the cards it saved, so they don't trigger the unsaved prompt.
 */
export function StepDone({
  step,
  disabled = false,
  hint,
  beforeFinish,
  saved,
}: {
  step: StepKey;
  disabled?: boolean;
  /** Shown while disabled: what's still missing. */
  hint?: string;
  beforeFinish?: () => Promise<void>;
  saved?: string[];
}) {
  const flow = useStepFlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = nextStep(step);
  if (!flow || !next) return null;

  const done = async () => {
    setBusy(true);
    setError(null);
    try {
      await beforeFinish?.();
      await flow.finish(step, { saved });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-center gap-3">
      <Button variant="accent" disabled={disabled || busy || flow.finishing} onClick={done}>
        {busy ? 'Saving…' : `Done — go to ${next.label}`}
      </Button>
      {disabled && hint && <span className="text-xs text-[color:var(--color-muted)]">{hint}</span>}
      {error && <span className="text-xs text-[color:var(--color-accent-text)]">{error}</span>}
    </Card>
  );
}
