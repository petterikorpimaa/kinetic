import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AnimationDocument } from '@/types';
import { serializeDocument, deserializeEnvelope } from '@/core/persistence';

/** Where the autosaved document lives. */
export type StorageMode = 'local' | 'session';

const DOCUMENT_KEY = 'svg-animator:document';
const MODE_KEY = 'svg-animator:mode';
const MODES: readonly StorageMode[] = ['local', 'session'];

function backing(mode: StorageMode): Storage {
  return mode === 'local' ? window.localStorage : window.sessionStorage;
}

/** The storage for `mode`, or null when it can't be WRITTEN (private mode / blocked). */
function tryStorage(mode: StorageMode): Storage | null {
  try {
    const storage = backing(mode);
    const probe = '__svga_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Read a key directly — never gated on a write-probe, so readable work survives a write failure. */
function readKey(mode: StorageMode, key: string): string | null {
  try {
    return backing(mode).getItem(key);
  } catch {
    return null;
  }
}

function readInitialMode(): StorageMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'session' ? 'session' : 'local';
  } catch {
    return 'local';
  }
}

/**
 * Autosave persistence (SVG-95/106/107). Wraps Web Storage with the pure
 * (de)serializer, tolerating storage being unavailable or over quota. The
 * document model is JSON-only (DEC-4), so this stores it verbatim. The wiring
 * that subscribes to document changes lives in `useAutosave`.
 */
export const usePersistenceStore = defineStore('persistence', () => {
  const mode = ref<StorageMode>(readInitialMode());
  const lastSavedAt = ref<number | null>(null);
  const available = ref(true);

  /** Persist the document to the active storage. No-op when storage is unusable. */
  function save(document: AnimationDocument): void {
    const storage = tryStorage(mode.value);
    if (storage === null) {
      available.value = false;
      return;
    }
    try {
      const now = Date.now();
      storage.setItem(DOCUMENT_KEY, serializeDocument(document, now));
      lastSavedAt.value = now;
      available.value = true;
    } catch {
      // Quota exceeded or write blocked — keep working, just don't persist.
      available.value = false;
    }
  }

  /** The most recently saved document across both storages, or null if none/invalid. */
  function restore(): AnimationDocument | null {
    let best: { document: AnimationDocument; savedAt: number } | null = null;
    for (const candidate of MODES) {
      const raw = readKey(candidate, DOCUMENT_KEY);
      if (!raw) continue;
      const envelope = deserializeEnvelope(raw);
      if (envelope === null) continue;
      if (best === null || envelope.savedAt > best.savedAt) best = envelope;
    }
    if (best !== null) lastSavedAt.value = best.savedAt;
    return best?.document ?? null;
  }

  /** Forget the saved document everywhere. */
  function clear(): void {
    for (const candidate of MODES) {
      try {
        backing(candidate).removeItem(DOCUMENT_KEY);
      } catch {
        // Ignore — nothing to clear if storage is unavailable.
      }
    }
    lastSavedAt.value = null;
  }

  /** Switch storage target; drops the now-inactive copy so it can't win a restore. */
  function setMode(next: StorageMode): void {
    if (mode.value === next) return;
    const previous = mode.value;
    try {
      backing(previous).removeItem(DOCUMENT_KEY);
    } catch {
      // Ignore — the previous storage may be unavailable.
    }
    mode.value = next;
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // Remembering the choice is best-effort.
    }
  }

  return { mode, lastSavedAt, available, save, restore, clear, setMode };
});
