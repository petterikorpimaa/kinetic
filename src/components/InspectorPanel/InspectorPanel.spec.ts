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

  it('the property key button toggles a keyframe at the playhead off when active', async () => {
    const { store, wrapper } = setup();
    await wrapper.find('[data-testid="add-property"]').trigger('click');
    await wrapper.find('[data-testid="add-prop-opacity"]').trigger('click');

    // First click adds a keyframe at the playhead; the dot is now active.
    await wrapper.find('[data-testid="prop-key-opacity"]').trigger('click');
    expect(store.trackFor('a', 'opacity')?.keyframes).toHaveLength(1);

    // Clicking the active dot removes that keyframe (the property stays).
    await wrapper.find('[data-testid="prop-key-opacity"]').trigger('click');
    expect(store.trackFor('a', 'opacity')?.keyframes).toHaveLength(0);
  });

  it('adds drop-shadow as one entry that creates the offset/blur/colour tracks', async () => {
    const { store, wrapper } = setup();
    await wrapper.find('[data-testid="add-property"]').trigger('click');
    await wrapper.find('[data-testid="add-prop-dropShadow"]').trigger('click');

    expect(store.trackFor('a', 'shadowX')).toBeDefined();
    expect(store.trackFor('a', 'shadowY')).toBeDefined();
    expect(store.trackFor('a', 'shadowBlur')).toBeDefined();
    expect(store.trackFor('a', 'shadowColor')).toBeDefined();

    expect(wrapper.find('[data-testid="dropshadow-group"]').exists()).toBe(true);
    // Four parameters, surfaced as labelled sub-rows under the one group header.
    expect(wrapper.findAll('[data-testid^="param-sub-shadow"]')).toHaveLength(4);
  });

  it('keyframes every drop-shadow parameter from the group dot', async () => {
    const { store, wrapper } = setup();
    await wrapper.find('[data-testid="add-property"]').trigger('click');
    await wrapper.find('[data-testid="add-prop-dropShadow"]').trigger('click');

    await wrapper.find('[data-testid="dropshadow-key"]').trigger('click');
    for (const property of ['shadowX', 'shadowY', 'shadowBlur', 'shadowColor'] as const) {
      const track = store.trackFor('a', property);
      expect(track?.keyframes).toHaveLength(1);
    }
  });

  it('removes all four drop-shadow tracks from the group header', async () => {
    const { store, wrapper } = setup();
    await wrapper.find('[data-testid="add-property"]').trigger('click');
    await wrapper.find('[data-testid="add-prop-dropShadow"]').trigger('click');

    await wrapper.find('[data-testid="dropshadow-remove"]').trigger('click');
    expect(store.trackFor('a', 'shadowX')).toBeUndefined();
    expect(store.trackFor('a', 'shadowY')).toBeUndefined();
    expect(store.trackFor('a', 'shadowBlur')).toBeUndefined();
    expect(store.trackFor('a', 'shadowColor')).toBeUndefined();
    expect(wrapper.find('[data-testid="dropshadow-group"]').exists()).toBe(false);
  });
});
