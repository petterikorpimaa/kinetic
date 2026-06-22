import { applyPatches, type Patch } from './immer';

/**
 * Undo/redo architecture (decided in Phase 0): snapshot/patch-based using
 * Immer patches. Each committed store mutation produces forward (`redo`) and
 * inverse (`undo`) patches; this module keeps the two stacks and applies them.
 *
 * Patches are plain JSON, so this same record can later be persisted for
 * autosave without any reshaping.
 *
 * Everything here is pure and framework-free — the Pinia store owns the
 * `History` value and the document state; this module just transforms them.
 */
export interface HistoryEntry {
  readonly label: string;
  /** Patches that re-apply the change (forward). */
  readonly redo: readonly Patch[];
  /** Patches that revert the change (inverse). */
  readonly undo: readonly Patch[];
}

export interface History {
  readonly past: readonly HistoryEntry[];
  readonly future: readonly HistoryEntry[];
  /** Max entries retained in `past`; older entries are dropped. */
  readonly limit: number;
}

const DEFAULT_LIMIT = 100;

export function createHistory(limit: number = DEFAULT_LIMIT): History {
  return { past: [], future: [], limit };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}

/** Push a new entry, clearing the redo stack and trimming to `limit`. */
export function record(history: History, entry: HistoryEntry): History {
  const past = [...history.past, entry];
  const trimmed = past.length > history.limit ? past.slice(past.length - history.limit) : past;
  return { ...history, past: trimmed, future: [] };
}

/** Apply the most recent entry's inverse patches, returning the new state. */
export function undo<TState>(history: History, state: TState): { history: History; state: TState } {
  if (!canUndo(history)) return { history, state };
  const entry = history.past[history.past.length - 1]!;
  // `state` is an object document; `as never` satisfies Immer's Objectish bound
  // without widening the public generic to any.
  const nextState = applyPatches(state as never, entry.undo as Patch[]) as TState;
  return {
    history: {
      ...history,
      past: history.past.slice(0, -1),
      future: [entry, ...history.future],
    },
    state: nextState,
  };
}

/** Re-apply the next entry's forward patches, returning the new state. */
export function redo<TState>(history: History, state: TState): { history: History; state: TState } {
  if (!canRedo(history)) return { history, state };
  const entry = history.future[0]!;
  const nextState = applyPatches(state as never, entry.redo as Patch[]) as TState;
  return {
    history: {
      ...history,
      past: [...history.past, entry],
      future: history.future.slice(1),
    },
    state: nextState,
  };
}
