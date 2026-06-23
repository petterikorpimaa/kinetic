import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import TimelineTrack from './TimelineTrack.vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { useKeyframeDrag } from '@/composables/useKeyframeDrag';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';
import type { SceneElement } from '@/types/element';
import type { AnyTrack } from '@/types/track';

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  useKeyframeDrag().setOffset(null); // reset the shared drag offset between tests
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

/** Build a store + a two-keyframe 'x' track and mount the lane for it. */
function setup() {
  const store = useDocumentStore();
  store.loadDocument(documentWithElement('a'));
  store.selectElement('a');
  store.setNumberValue('a', 'x', 0, 0);
  store.setNumberValue('a', 'x', 1, 100);
  const track = store.trackFor('a', 'x') as AnyTrack;
  const wrapper = mount(TimelineTrack, { props: { track }, global: { plugins: [pinia] } });
  return { store, track, wrapper };
}

describe('TimelineTrack', () => {
  it('renders the property label, count, and a diamond per keyframe', () => {
    const { wrapper } = setup();
    expect(wrapper.find('[data-testid="track-name"]').text()).toBe('Position X');
    expect(wrapper.find('[data-testid="track-count"]').text()).toBe('2');
    expect(wrapper.findAll('[data-testid="keyframe"]')).toHaveLength(2);
  });

  it('selects a keyframe on pointerdown', async () => {
    const { store, track, wrapper } = setup();
    await wrapper.findAll('[data-testid="keyframe"]')[0]!.trigger('pointerdown');

    expect(store.isKeyframeSelected(track.keyframes[0]!.id)).toBe(true);
    expect(wrapper.find('[data-selected="true"]').exists()).toBe(true);
  });

  it('adds a keyframe at the playhead from the lane button', async () => {
    const { store, wrapper } = setup();
    usePlaybackStore().setCurrentTime(0.5);

    await wrapper.find('[data-testid="lane-add-keyframe"]').trigger('click');
    expect(store.trackFor('a', 'x')?.keyframes.map((k) => k.time)).toEqual([0, 0.5, 1]);
  });

  it('previews the shared drag offset on selected keyframes (so other lanes move too)', async () => {
    const { store, track, wrapper } = setup(); // duration 3s; keyframes at 0 and 1
    store.selectKeyframe(track.keyframes[0]!.id); // select only the first
    // Simulate a drag happening in another lane shifting the selection by +0.6s.
    useKeyframeDrag().setOffset(0.6);
    await nextTick();

    const diamonds = wrapper.findAll('[data-testid="keyframe"]');
    // Selected keyframe previews at (0 + 0.6) / 3 = 20%.
    expect(diamonds[0]!.attributes('style')).toContain('left: 20%');
    // Unselected keyframe stays put at 1 / 3 ≈ 33.33%.
    expect(diamonds[1]!.attributes('style')).toContain('left: 33.3');
  });
});
