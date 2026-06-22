import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePersistenceStore } from './persistence';
import { serializeDocument } from '@/core/persistence';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';

const DOCUMENT_KEY = 'svg-animator:document';

function docNamed(name: string): AnimationDocument {
  return { ...createEmptyDocument('doc', name), svgMarkup: '<svg/>' };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setActivePinia(createPinia());
});

describe('usePersistenceStore', () => {
  it('saves and restores the document, tracking last-saved time', () => {
    const store = usePersistenceStore();
    expect(store.restore()).toBeNull();

    store.save(docNamed('alpha'));
    expect(store.lastSavedAt).not.toBeNull();

    expect(store.restore()?.name).toBe('alpha');
  });

  it('clears the saved document everywhere', () => {
    const store = usePersistenceStore();
    store.save(docNamed('alpha'));
    store.clear();
    expect(store.restore()).toBeNull();
    expect(store.lastSavedAt).toBeNull();
  });

  it('switching mode drops the previous storage copy', () => {
    const store = usePersistenceStore();
    store.save(docNamed('alpha')); // default mode: local
    expect(window.localStorage.getItem(DOCUMENT_KEY)).not.toBeNull();

    store.setMode('session');
    expect(window.localStorage.getItem(DOCUMENT_KEY)).toBeNull();

    store.save(docNamed('beta'));
    expect(window.sessionStorage.getItem(DOCUMENT_KEY)).not.toBeNull();
    expect(store.restore()?.name).toBe('beta');
  });

  it('restores the most recent document across both storages', () => {
    window.localStorage.setItem(DOCUMENT_KEY, serializeDocument(docNamed('older'), 100));
    window.sessionStorage.setItem(DOCUMENT_KEY, serializeDocument(docNamed('newer'), 200));

    const store = usePersistenceStore();
    expect(store.restore()?.name).toBe('newer');
  });

  it('still restores readable work when writes are blocked', () => {
    // Seed real data, then make writes throw (e.g. quota) while reads still work.
    window.localStorage.setItem(DOCUMENT_KEY, serializeDocument(docNamed('saved'), 100));
    const realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    try {
      const store = usePersistenceStore();
      expect(store.restore()?.name).toBe('saved');
    } finally {
      Storage.prototype.setItem = realSetItem;
    }
  });
});
