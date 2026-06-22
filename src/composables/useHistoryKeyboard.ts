import { useEventListener } from '@vueuse/core';
import { useDocumentStore } from '@/stores/document';
import { isTypingTarget } from './isTypingTarget';

/**
 * Global undo/redo shortcuts (M6, Epic 12): ⌘/Ctrl+Z undoes, ⌘/Ctrl+Shift+Z and
 * Ctrl+Y redo. Ignored while typing in a field so the browser's native input
 * undo still works. Mount once, from the editor shell.
 */
export function useHistoryKeyboard(): void {
  const store = useDocumentStore();

  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    if (!event.metaKey && !event.ctrlKey) return;

    const key = event.key.toLowerCase();
    const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
    const isUndo = key === 'z' && !event.shiftKey;
    if (!isRedo && !isUndo) return;

    event.preventDefault();
    if (isRedo) store.redo();
    else store.undo();
  });
}
