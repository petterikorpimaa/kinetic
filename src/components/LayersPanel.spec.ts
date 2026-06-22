import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import LayersPanel from './LayersPanel.vue';
import { useDocumentStore } from '@/stores/document';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';
import type { SceneElement } from '@/types/element';

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
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

function documentWithElements(ids: string[]): AnimationDocument {
  return { ...createEmptyDocument('doc', 'Fixture'), elements: ids.map(elementFixture) };
}

describe('LayersPanel — keyframe-present dot', () => {
  it('shows a dot only for layers that carry keyframes', async () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a', 'b']));
    store.setNumberValue('a', 'x', 0, 10); // 'a' now has a keyframe; 'b' does not
    const wrapper = mount(LayersPanel, { global: { plugins: [pinia] } });
    await nextTick();

    expect(wrapper.find('[data-testid="layer-dot-a"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="layer-dot-b"]').exists()).toBe(false);
  });
});
