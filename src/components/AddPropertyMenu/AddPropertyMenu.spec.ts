import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import AddPropertyMenu from './AddPropertyMenu.vue';
import { useDocumentStore } from '@/stores/document';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';
import type { SceneElement } from '@/types/element';

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

function taggedDoc(id: string, tag: string): AnimationDocument {
  const element: SceneElement = {
    id,
    domRef: id,
    tag,
    label: id,
    transformOrigin: { x: 0, y: 0 },
    baseTransform: '',
    pathLength: 0,
  };
  return { ...createEmptyDocument('doc', 'Fixture'), elements: [element] };
}

function mountFor(tag: string) {
  const store = useDocumentStore();
  store.loadDocument(taggedDoc('a', tag));
  const wrapper = mount(AddPropertyMenu, {
    props: { elementId: 'a', activeKeys: [] },
    global: { plugins: [pinia] },
  });
  return { store, wrapper };
}

describe('AddPropertyMenu — shape support gating (SVG-156)', () => {
  it('lists every property; supported ones are enabled for a geometry shape', () => {
    const { wrapper } = mountFor('circle');
    const fill = wrapper.find('[data-testid="add-prop-fill"]');
    const draw = wrapper.find('[data-testid="add-prop-draw"]');
    expect(fill.exists()).toBe(true);
    expect(draw.exists()).toBe(true);
    expect(fill.attributes('aria-disabled')).toBeUndefined();
    expect(draw.attributes('aria-disabled')).toBeUndefined();
  });

  it('shows unsupported properties disabled with an explanatory tooltip', () => {
    const { wrapper } = mountFor('g'); // a group can't draw-on
    const draw = wrapper.find('[data-testid="add-prop-draw"]');
    expect(draw.exists()).toBe(true); // still listed
    expect(draw.attributes('aria-disabled')).toBe('true');
    expect(draw.attributes('title')).toMatch(/group/i);
    // fill cascades through a group — still enabled
    expect(
      wrapper.find('[data-testid="add-prop-fill"]').attributes('aria-disabled'),
    ).toBeUndefined();
  });

  it('does not add an unsupported property when its disabled row is clicked', async () => {
    const { store, wrapper } = mountFor('text'); // text has no draw-on
    const draw = wrapper.find('[data-testid="add-prop-draw"]');
    expect(draw.attributes('aria-disabled')).toBe('true');
    await draw.trigger('click');
    expect(store.trackFor('a', 'draw')).toBeUndefined();
  });

  it('adds a supported property when clicked', async () => {
    const { store, wrapper } = mountFor('text');
    await wrapper.find('[data-testid="add-prop-fill"]').trigger('click');
    expect(store.trackFor('a', 'fill')).toBeDefined();
  });

  it('disables fill for a line (stroke-only shape)', () => {
    const { wrapper } = mountFor('line');
    expect(wrapper.find('[data-testid="add-prop-fill"]').attributes('aria-disabled')).toBe('true');
    expect(
      wrapper.find('[data-testid="add-prop-draw"]').attributes('aria-disabled'),
    ).toBeUndefined();
  });
});
