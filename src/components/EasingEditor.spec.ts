import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import EasingEditor from './EasingEditor.vue';
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

/** Store with a two-keyframe 'x' track, plus the mounted editor. */
function setup() {
  const store = useDocumentStore();
  store.loadDocument(documentWithElement('a'));
  store.selectElement('a');
  store.setNumberValue('a', 'x', 0, 0);
  store.setNumberValue('a', 'x', 1, 100);
  const wrapper = mount(EasingEditor, { global: { plugins: [pinia] } });
  return { store, wrapper };
}

function keyframeIds(store: ReturnType<typeof useDocumentStore>): string[] {
  return store.trackFor('a', 'x')!.keyframes.map((k) => k.id);
}

describe('EasingEditor', () => {
  it('prompts when no keyframe is selected', () => {
    const { wrapper } = setup();
    expect(wrapper.find('[data-testid="easing-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="easing-curve"]').exists()).toBe(false);
  });

  it('shows the curve and readout for a single selected keyframe', async () => {
    const { store, wrapper } = setup();
    store.selectKeyframe(keyframeIds(store)[0]!);
    await nextTick();

    expect(wrapper.find('[data-testid="easing-curve"]').exists()).toBe(true);
    // A fresh keyframe defaults to the In-Out preset ([0.42, 0, 0.58, 1]).
    expect(wrapper.find('[data-testid="easing-readout"]').text()).toBe(
      'cubic-bezier(0.42, 0, 0.58, 1)',
    );
  });

  it('applies a preset to the selected keyframe', async () => {
    const { store, wrapper } = setup();
    store.selectKeyframe(keyframeIds(store)[0]!);
    await nextTick();

    await wrapper.find('[data-testid="easing-preset-Linear"]').trigger('click');
    expect(store.trackFor('a', 'x')!.keyframes[0]!.easing).toEqual([0, 0, 1, 1]);
    expect(wrapper.find('[data-testid="easing-readout"]').text()).toBe('cubic-bezier(0, 0, 1, 1)');
  });

  it('switches to presets-only and applies to all when several are selected', async () => {
    const { store, wrapper } = setup();
    const [k0, k1] = keyframeIds(store);
    store.selectKeyframe(k0!);
    store.selectKeyframe(k1!, true);
    await nextTick();

    expect(wrapper.find('[data-testid="easing-multi"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="easing-curve"]').exists()).toBe(false);

    await wrapper.find('[data-testid="easing-preset-Out"]').trigger('click');
    const keys = store.trackFor('a', 'x')!.keyframes;
    expect(keys[0]!.easing).toEqual([0, 0, 0.58, 1]);
    expect(keys[1]!.easing).toEqual([0, 0, 0.58, 1]);
  });
});
