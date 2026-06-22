import { describe, it, expect } from 'vitest';
import { produceWithPatches } from './immer';
import {
  createHistory,
  record,
  undo,
  redo,
  canUndo,
  canRedo,
  type History,
  type HistoryEntry,
} from './history';

interface Doc {
  count: number;
  items: string[];
}

function edit(
  state: Doc,
  label: string,
  recipe: (draft: Doc) => void,
): { state: Doc; entry: HistoryEntry } {
  const [next, redoPatches, undoPatches] = produceWithPatches(state, recipe);
  return { state: next, entry: { label, redo: redoPatches, undo: undoPatches } };
}

describe('history', () => {
  it('starts empty', () => {
    const history = createHistory();
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('records an entry and enables undo', () => {
    let history = createHistory();
    const { entry } = edit({ count: 0, items: [] }, 'increment', (d) => {
      d.count += 1;
    });
    history = record(history, entry);
    expect(canUndo(history)).toBe(true);
    expect(history.past).toHaveLength(1);
  });

  it('undo reverts state and redo re-applies it', () => {
    let history = createHistory();
    const start: Doc = { count: 0, items: [] };
    const { state: afterEdit, entry } = edit(start, 'add', (d) => {
      d.count = 5;
      d.items.push('a');
    });
    history = record(history, entry);

    const undone = undo<Doc>(history, afterEdit);
    expect(undone.state).toEqual(start);
    expect(canRedo(undone.history)).toBe(true);
    expect(canUndo(undone.history)).toBe(false);

    const redone = redo<Doc>(undone.history, undone.state);
    expect(redone.state).toEqual(afterEdit);
    expect(canUndo(redone.history)).toBe(true);
    expect(canRedo(redone.history)).toBe(false);
  });

  it('recording a new edit clears the redo stack', () => {
    let history = createHistory();
    const s0: Doc = { count: 0, items: [] };
    const e1 = edit(s0, 'e1', (d) => {
      d.count = 1;
    });
    history = record(history, e1.entry);
    const undone = undo<Doc>(history, e1.state);

    const e2 = edit(undone.state, 'e2', (d) => {
      d.count = 9;
    });
    const after = record(undone.history, e2.entry);
    expect(canRedo(after)).toBe(false);
    expect(after.past).toHaveLength(1);
  });

  it('undo/redo on an empty history is a no-op', () => {
    const history = createHistory();
    const state: Doc = { count: 0, items: [] };
    expect(undo<Doc>(history, state).state).toBe(state);
    expect(redo<Doc>(history, state).state).toBe(state);
  });

  it('trims the past stack to the configured limit', () => {
    let history: History = createHistory(3);
    let state: Doc = { count: 0, items: [] };
    for (let i = 1; i <= 5; i++) {
      const next = edit(state, `e${i}`, (d) => {
        d.count = i;
      });
      state = next.state;
      history = record(history, next.entry);
    }
    expect(history.past).toHaveLength(3);
    expect(history.past.map((e) => e.label)).toEqual(['e3', 'e4', 'e5']);
  });
});
