import { createContext, useContext, useEffect } from 'react';
import type { StepKey } from '../../lib/jobFlow';

export const UNSAVED_PROMPT = 'You have unsaved changes on this step. Leave without saving them?';

export interface StepFlow {
  /** Moves to another tab, asking first if a card has unsaved edits. False if they stayed. */
  goTo: (tab: string) => boolean;
  /**
   * Finishes `step`: moves the job's status forward, then goes to the next step when
   * auto-advance is on. `saved` names cards the caller has just saved (no prompt for them).
   */
  finish: (step: StepKey, opts?: { saved?: string[] }) => Promise<boolean>;
  finishing: boolean;
  autoAdvance: boolean;
  setAutoAdvance: (on: boolean) => void;
  /** Cards report unsaved edits here; use `useUnsaved` rather than calling it. */
  markUnsaved: (key: string, unsaved: boolean) => void;
}

export const StepFlowContext = createContext<StepFlow | null>(null);

/** Null outside the job page (a tab rendered on its own, as in tests): no step controls. */
export function useStepFlow(): StepFlow | null {
  return useContext(StepFlowContext);
}

/** Tells the job page this card has unsaved edits, so leaving the step asks first. */
export function useUnsaved(key: string, unsaved: boolean) {
  const flow = useContext(StepFlowContext);
  const mark = flow?.markUnsaved;
  useEffect(() => {
    if (!mark) return;
    mark(key, unsaved);
    return () => mark(key, false);
  }, [mark, key, unsaved]);
}
