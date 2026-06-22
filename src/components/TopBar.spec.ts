import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import TopBar from './TopBar.vue';
import { useDocumentStore } from '@/stores/document';
import { usePersistenceStore } from '@/stores/persistence';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';

let pinia: Pinia;

function documentWithElement(): AnimationDocument {
  return {
    ...createEmptyDocument('doc', 'Fixture'),
    elements: [
      {
        id: 'a',
        domRef: 'a',
        tag: 'circle',
        label: 'A',
        transformOrigin: { x: 0, y: 0 },
        baseTransform: '',
        pathLength: 0,
      },
    ],
  };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  pinia = createPinia();
  setActivePinia(pinia);
});

function mountTopBar() {
  return mount(TopBar, { global: { plugins: [pinia] } });
}

describe('TopBar', () => {
  it('disables undo/redo until there is history', () => {
    const wrapper = mountTopBar();
    expect(wrapper.find('[data-testid="undo"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="redo"]').attributes('disabled')).toBeDefined();
  });

  it('enables undo after an edit and reverts it on click', async () => {
    const wrapper = mountTopBar();
    const store = useDocumentStore();
    store.loadDocument(documentWithElement());
    store.setNumberValue('a', 'x', 0, 5);
    await nextTick();

    expect(wrapper.find('[data-testid="undo"]').attributes('disabled')).toBeUndefined();
    await wrapper.find('[data-testid="undo"]').trigger('click');
    expect(store.trackFor('a', 'x')?.keyframes ?? []).toHaveLength(0);
  });

  it('emits import and export from the menu', async () => {
    const wrapper = mountTopBar();
    await wrapper.find('[data-testid="menu-button"]').trigger('click');
    await wrapper.find('[data-testid="menu-import"]').trigger('click');
    expect(wrapper.emitted('import')).toBeTruthy();

    await wrapper.find('[data-testid="menu-button"]').trigger('click');
    await wrapper.find('[data-testid="menu-export"]').trigger('click');
    expect(wrapper.emitted('export')).toBeTruthy();
  });

  it('shows the saved indicator once a save has happened', async () => {
    const wrapper = mountTopBar();
    expect(wrapper.find('[data-testid="saved-indicator"]').exists()).toBe(false);

    usePersistenceStore().save(documentWithElement());
    await nextTick();
    expect(wrapper.find('[data-testid="saved-indicator"]').text()).toContain('Saved');
  });

  it('toggles the autosave storage mode', async () => {
    const wrapper = mountTopBar();
    const persistence = usePersistenceStore();
    expect(persistence.mode).toBe('local');

    await wrapper.find('[data-testid="menu-button"]').trigger('click');
    await wrapper.find('[data-testid="menu-storage"]').trigger('click');
    expect(persistence.mode).toBe('session');
  });

  it('clears saved work after confirmation and resets the document', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const wrapper = mountTopBar();
    const store = useDocumentStore();
    const persistence = usePersistenceStore();
    store.loadDocument(documentWithElement());
    persistence.save(store.document);

    await wrapper.find('[data-testid="menu-button"]').trigger('click');
    await wrapper.find('[data-testid="menu-clear"]').trigger('click');

    expect(persistence.restore()).toBeNull();
    expect(store.document.elements).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
