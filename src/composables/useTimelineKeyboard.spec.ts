import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { useTimelineKeyboard } from './useTimelineKeyboard';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';
import type { SceneElement } from '@/types/element';

let pinia: Pinia;
let wrapper: VueWrapper;

const Harness = defineComponent({
  setup() {
    useTimelineKeyboard();
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

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
}

describe('useTimelineKeyboard', () => {
  it('toggles playback on Space', () => {
    const playback = usePlaybackStore();
    press(' ');
    expect(playback.playing).toBe(true);
    press(' ');
    expect(playback.playing).toBe(false);
  });

  it('nudges the playhead with the arrow keys', () => {
    const playback = usePlaybackStore();
    playback.setCurrentTime(1);
    press('ArrowRight');
    expect(playback.currentTime).toBeCloseTo(1.05, 6);
    press('ArrowLeft');
    expect(playback.currentTime).toBeCloseTo(1, 6);
  });

  it('deletes the selected keyframes on Delete', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElement('a'));
    store.setNumberValue('a', 'x', 0, 0);
    const id = store.trackFor('a', 'x')!.keyframes[0]!.id;
    store.selectKeyframe(id);

    press('Delete');
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(0);
  });
});
