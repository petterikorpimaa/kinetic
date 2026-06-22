import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { useHistoryKeyboard } from './useHistoryKeyboard';
import { useDocumentStore } from '@/stores/document';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';
import type { SceneElement } from '@/types/element';

let pinia: Pinia;
let wrapper: VueWrapper;

const Harness = defineComponent({
  setup() {
    useHistoryKeyboard();
    return () => h('div');
  },
});

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(Harness, { global: { plugins: [pinia] } });
});

afterEach(() => {
  wrapper.unmount();
});

function elementFixture(id: string): SceneElement {
  return {
    id,
    domRef: id,
    tag: 'circle',
    label: id,
    transformOrigin: { x: 0, y: 0 },
    baseTransform: '',
    pathLength: 0,
  };
}

function documentWithElement(id: string): AnimationDocument {
  return { ...createEmptyDocument('doc', 'Fixture'), elements: [elementFixture(id)] };
}

function press(key: string, modifiers: Partial<KeyboardEventInit> = {}): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers }));
}

describe('useHistoryKeyboard', () => {
  it('undoes with ⌘/Ctrl+Z and redoes with Shift+Z', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElement('a'));
    store.setNumberValue('a', 'x', 0, 5);
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(1);

    press('z', { ctrlKey: true });
    expect(store.trackFor('a', 'x')?.keyframes ?? []).toHaveLength(0);

    press('z', { ctrlKey: true, shiftKey: true });
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(1);
  });

  it('redoes with Ctrl+Y', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElement('a'));
    store.setNumberValue('a', 'x', 0, 5);
    store.undo();
    expect(store.trackFor('a', 'x')?.keyframes ?? []).toHaveLength(0);

    press('y', { ctrlKey: true });
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(1);
  });

  it('ignores a bare Z with no modifier', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElement('a'));
    store.setNumberValue('a', 'x', 0, 5);

    press('z');
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(1);
  });
});
