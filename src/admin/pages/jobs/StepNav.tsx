import { useRole } from '../../auth/authContext';
import { nextStep, prevStep, STEPS, stepIndex, type StepKey } from '../../lib/jobFlow';
import { useStepFlow } from './stepFlow';

const stepBtn =
  'flex min-h-11 min-w-0 items-center gap-1 rounded-md px-2 text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-raised)] disabled:invisible';

/**
 * Bottom bar on the job page: previous / next step, where you are, and the auto-advance
 * switch. Moving here never finishes a step — the Done buttons on each step do that.
 */
export function StepNav({
  step,
  note,
  error,
}: {
  step: StepKey;
  note: string | null;
  error: string | null;
}) {
  const flow = useStepFlow();
  // Staff phones have a fixed tab bar at the bottom: sit just above it.
  const staff = useRole() === 'staff';
  if (!flow) return null;
  const prev = prevStep(step);
  const next = nextStep(step);
  const current = STEPS[stepIndex(step)];

  return (
    <div
      className={`sticky z-20 -mx-4 space-y-2 md:mx-0 border-t border-[color:var(--color-line)] bg-[color:var(--color-ground)]/95 px-4 py-2 backdrop-blur ${
        staff ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0' : 'bottom-0'
      }`}
    >
      {error && <p className="text-xs text-[color:var(--color-accent-text)]">{error}</p>}
      {note && (
        <p role="status" className="text-xs text-[color:var(--color-muted)]">
          {note}
        </p>
      )}
      <nav aria-label="Job steps" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          className={`${stepBtn} justify-self-start`}
          disabled={!prev}
          onClick={() => prev && flow.goTo(prev.key)}
        >
          ‹ <span className="truncate">{prev?.label ?? ''}</span>
        </button>
        <div className="text-center">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
            Step {stepIndex(step) + 1} of {STEPS.length}
          </span>
          <span className="text-sm font-semibold text-[color:var(--color-ink)]">
            {current.label}
          </span>
        </div>
        <button
          type="button"
          className={`${stepBtn} justify-self-end`}
          disabled={!next}
          onClick={() => next && flow.goTo(next.key)}
        >
          <span className="truncate">{next?.label ?? ''}</span> ›
        </button>
      </nav>
      <label className="flex items-center justify-center gap-2 text-xs text-[color:var(--color-muted)]">
        <button
          type="button"
          role="switch"
          aria-checked={flow.autoAdvance}
          onClick={() => flow.setAutoAdvance(!flow.autoAdvance)}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            flow.autoAdvance ? 'bg-signal' : 'bg-[color:var(--color-line)]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              flow.autoAdvance ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        Go to the next step when one is done
      </label>
    </div>
  );
}
