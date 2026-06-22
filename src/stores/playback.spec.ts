import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlaybackStore } from './playback';

describe('usePlaybackStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts stopped at time zero, looping', () => {
    const store = usePlaybackStore();
    expect(store.currentTime).toBe(0);
    expect(store.playing).toBe(false);
    expect(store.loop).toBe(true);
  });

  it('sets the playhead, clamping to non-negative', () => {
    const store = usePlaybackStore();
    store.setCurrentTime(1.5);
    expect(store.currentTime).toBe(1.5);
    store.setCurrentTime(-3);
    expect(store.currentTime).toBe(0);
  });

  it('plays and pauses', () => {
    const store = usePlaybackStore();
    store.play(4);
    expect(store.playing).toBe(true);
    store.pause();
    expect(store.playing).toBe(false);
  });

  it('toggles play state', () => {
    const store = usePlaybackStore();
    store.toggle(4);
    expect(store.playing).toBe(true);
    store.toggle(4);
    expect(store.playing).toBe(false);
  });

  it('restarts from zero when playing while parked at the end (no loop)', () => {
    const store = usePlaybackStore();
    store.setLoop(false);
    store.setCurrentTime(4);
    store.play(4);
    expect(store.currentTime).toBe(0);
    expect(store.playing).toBe(true);
  });

  it('does not rewind on play when looping', () => {
    const store = usePlaybackStore();
    store.setCurrentTime(4);
    store.play(4);
    expect(store.currentTime).toBe(4);
  });

  it('stops back to the start', () => {
    const store = usePlaybackStore();
    store.setCurrentTime(2);
    store.play(4);
    store.stop();
    expect(store.currentTime).toBe(0);
    expect(store.playing).toBe(false);
  });

  it('rewinds without changing play state', () => {
    const store = usePlaybackStore();
    store.setCurrentTime(2);
    store.play(4);
    store.rewind();
    expect(store.currentTime).toBe(0);
    expect(store.playing).toBe(true);
  });

  it('toggles loop', () => {
    const store = usePlaybackStore();
    expect(store.loop).toBe(true);
    store.toggleLoop();
    expect(store.loop).toBe(false);
  });

  it('advances on tick and pauses at the end when not looping', () => {
    const store = usePlaybackStore();
    store.setLoop(false);
    store.setCurrentTime(3.9);
    store.play(4);
    store.tick(0.5, 4);
    expect(store.currentTime).toBe(4);
    expect(store.playing).toBe(false);
  });

  it('wraps on tick when looping', () => {
    const store = usePlaybackStore();
    store.setCurrentTime(3.8);
    store.play(4);
    store.tick(0.5, 4);
    expect(store.currentTime).toBeCloseTo(0.3, 6);
    expect(store.playing).toBe(true);
  });
});
