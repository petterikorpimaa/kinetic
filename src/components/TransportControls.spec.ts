import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import TransportControls from './TransportControls.vue';
import { usePlaybackStore } from '@/stores/playback';

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

function mountTransport() {
  return mount(TransportControls, { global: { plugins: [pinia] } });
}

describe('TransportControls', () => {
  it('toggles play/pause via the store', async () => {
    const wrapper = mountTransport();
    const playback = usePlaybackStore();

    await wrapper.find('[data-testid="transport-play"]').trigger('click');
    expect(playback.playing).toBe(true);
    await wrapper.find('[data-testid="transport-play"]').trigger('click');
    expect(playback.playing).toBe(false);
  });

  it('toggles loop', async () => {
    const wrapper = mountTransport();
    const playback = usePlaybackStore();
    expect(playback.loop).toBe(true);

    await wrapper.find('[data-testid="transport-loop"]').trigger('click');
    expect(playback.loop).toBe(false);
  });

  it('rewinds to the start', async () => {
    const wrapper = mountTransport();
    const playback = usePlaybackStore();
    playback.setCurrentTime(2);

    await wrapper.find('[data-testid="transport-rewind"]').trigger('click');
    expect(playback.currentTime).toBe(0);
  });

  it('shows the live playhead time', async () => {
    const wrapper = mountTransport();
    const playback = usePlaybackStore();

    expect(wrapper.find('[data-testid="transport-time"]').text()).toBe('0.00s');
    playback.setCurrentTime(1.5);
    await nextTick();
    expect(wrapper.find('[data-testid="transport-time"]').text()).toBe('1.50s');
  });
});
