import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import InspectorPanel from './InspectorPanel.vue';
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

function documentWithElement(id: string): AnimationDocument {
  return { ...createEmptyDocument('doc', 'Fixture'), elements: [elementFixture(id)] };
}

function setup() {
  const store = useDocumentStore();
  store.loadDocument(documentWithElement('a'));
  store.selectElement('a');
  const wrapper = mount(InspectorPanel, { global: { plugins: [pinia] } });
  return { store, wrapper };
}

describe('InspectorPanel — filters', () => {
  it('adds a scalar filter from the Filters group', async () => {
    const { store, wrapper } = setup();
    await wrapper.find('[data-testid="add-property"]').trigger('click');
    await wrapper.find('[data-testid="add-prop-blur"]').trigger('click');
    expect(store.trackFor('a', 'blur')).toBeDefined();
    expect(wrapper.find('[data-testid="prop-row-blur"]').exists()).toBe(true);
  });

  it('adds drop-shadow as one entry that creates the X/Y/colour tracks', async () => {
    const { store, wrapper } = setup();
    await wrapper.find('[data-testid="add-property"]').trigger('click');
    await wrapper.find('[data-testid="add-prop-dropShadow"]').trigger('click');

    expect(store.trackFor('a', 'shadowX')).toBeDefined();
    expect(store.trackFor('a', 'shadowY')).toBeDefined();
    expect(store.trackFor('a', 'shadowColor')).toBeDefined();

    expect(wrapper.find('[data-testid="dropshadow-group"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid^="prop-row-shadow"]')).toHaveLength(3);
  });

  it('removes all three drop-shadow tracks from the group header', async () => {
    const { store, wrapper } = setup();
    await wrapper.find('[data-testid="add-property"]').trigger('click');
    await wrapper.find('[data-testid="add-prop-dropShadow"]').trigger('click');

    await wrapper.find('[data-testid="dropshadow-remove"]').trigger('click');
    expect(store.trackFor('a', 'shadowX')).toBeUndefined();
    expect(store.trackFor('a', 'shadowY')).toBeUndefined();
    expect(store.trackFor('a', 'shadowColor')).toBeUndefined();
    expect(wrapper.find('[data-testid="dropshadow-group"]').exists()).toBe(false);
  });
});
