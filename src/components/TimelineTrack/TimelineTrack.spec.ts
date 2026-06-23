import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import TimelineTrack from './TimelineTrack.vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';
import type { SceneElement } from '@/types/element';
import type { AnyTrack } from '@/types/track';

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
});
