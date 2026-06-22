import { watch } from 'vue';
import { watchDebounced } from '@vueuse/core';
import { useDocumentStore } from '@/stores/document';
import { usePersistenceStore } from '@/stores/persistence';

const AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * Autosave wiring (SVG-95/106). On setup, restores the most recent saved
 * document (resetting history via `loadDocument`); then debounces a persist on
 * every document change. Switching storage mode immediately re-persists to the
 * new target. Returns whether a document was restored so the shell can decide
 * whether to fall back to the sample scene.
 */
export function useAutosave(): { restored: boolean } {
  const documentStore = useDocumentStore();
  const persistence = usePersistenceStore();

  const restoredDoc = persistence.restore();
  if (restoredDoc !== null) documentStore.loadDocument(restoredDoc);

  watchDebounced(
    () => documentStore.document,
    (doc) => persistence.save(doc),
    {
      debounce: AUTOSAVE_DEBOUNCE_MS,
    },
  );

  watch(
    () => persistence.mode,
    () => persistence.save(documentStore.document),
  );

  return { restored: restoredDoc !== null };
}
