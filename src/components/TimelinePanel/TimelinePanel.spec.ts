import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import TimelinePanel from './TimelinePanel.vue';
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

describe('TimelinePanel', () => {
  it('shows the empty state with no selection', () => {
    const wrapper = mount(TimelinePanel, { global: { plugins: [pinia] } });
    expect(wrapper.find('[data-testid="timeline-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="timeline-track"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="timeline-playhead"]').exists()).toBe(false);
  });

  it('renders a lane and the playhead once the selected element has tracks', async () => {
    const store = useDocumentStore();
    const wrapper = mount(TimelinePanel, { global: { plugins: [pinia] } });

    store.loadDocument(documentWithElement('a'));
    store.selectElement('a');
    store.setNumberValue('a', 'x', 0, 0);
    await nextTick();

    expect(wrapper.find('[data-testid="timeline-empty"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="timeline-track"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="timeline-playhead"]').exists()).toBe(true);
  });

  it('clears the keyframe selection when an empty lane is pressed (no drag)', async () => {
    const store = useDocumentStore();
    const wrapper = mount(TimelinePanel, { global: { plugins: [pinia] } });

    store.loadDocument(documentWithElement('a'));
    store.selectElement('a');
    store.setNumberValue('a', 'x', 0, 0);
    await nextTick();

    const id = store.trackFor('a', 'x')!.keyframes[0]!.id;
    store.selectKeyframe(id);
    expect(store.selectedKeyframeIds.size).toBe(1);

    // A press on the lane that never moves clears the selection on pointer-up.
    await wrapper.find('[data-lane]').trigger('pointerdown');
    window.dispatchEvent(new Event('pointerup'));
    expect(store.selectedKeyframeIds.size).toBe(0);
  });
});
