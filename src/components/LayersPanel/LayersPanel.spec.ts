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

function nestedElement(id: string, parentId: string, tag = 'path'): SceneElement {
  return { ...elementFixture(id), tag, parentId };
}

/** grp ─ p1, p2 (a group with two child paths). */
function groupedDocument(): AnimationDocument {
  return {
    ...createEmptyDocument('doc', 'Fixture'),
    elements: [
      { ...elementFixture('grp'), tag: 'g' },
      nestedElement('p1', 'grp'),
      nestedElement('p2', 'grp'),
    ],
  };
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

  it('rolls a descendant keyframe up to its group', async () => {
    const store = useDocumentStore();
    store.loadDocument(groupedDocument());
    store.setNumberValue('p1', 'x', 0, 10); // a child has a keyframe
    const wrapper = mount(LayersPanel, { global: { plugins: [pinia] } });
    await nextTick();

    expect(wrapper.find('[data-testid="layer-dot-grp"]').exists()).toBe(true); // rolled up
    expect(wrapper.find('[data-testid="layer-dot-p2"]').exists()).toBe(false);
  });
});

describe('LayersPanel — tree view (SVG-137)', () => {
  it('shows nested children as their own rows with a disclosure on the group', async () => {
    const store = useDocumentStore();
    store.loadDocument(groupedDocument());
    const wrapper = mount(LayersPanel, { global: { plugins: [pinia] } });
    await nextTick();

    expect(wrapper.find('[data-testid="layer-row-grp"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="layer-row-p1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="layer-row-p2"]').exists()).toBe(true);
    // Only the group gets a disclosure toggle.
    expect(wrapper.find('[data-testid="layer-disclosure-grp"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="layer-disclosure-p1"]').exists()).toBe(false);
  });

  it('collapsing a group hides its children but keeps them selectable once expanded', async () => {
    const store = useDocumentStore();
    store.loadDocument(groupedDocument());
    const wrapper = mount(LayersPanel, { global: { plugins: [pinia] } });
    await nextTick();

    await wrapper.find('[data-testid="layer-disclosure-grp"]').trigger('click');
    expect(wrapper.find('[data-testid="layer-row-p1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="layer-row-p2"]').exists()).toBe(false);

    await wrapper.find('[data-testid="layer-disclosure-grp"]').trigger('click');
    expect(wrapper.find('[data-testid="layer-row-p1"]').exists()).toBe(true);
    await wrapper.find('[data-testid="layer-row-p1"]').find('button').trigger('click');
    expect(store.document.selectedElementId).toBe('p1');
  });

  it('clicking the disclosure does not change the selection', async () => {
    const store = useDocumentStore();
    store.loadDocument(groupedDocument());
    store.selectElement('p2');
    const wrapper = mount(LayersPanel, { global: { plugins: [pinia] } });
    await nextTick();

    await wrapper.find('[data-testid="layer-disclosure-grp"]').trigger('click');
    expect(store.document.selectedElementId).toBe('p2');
  });
});
