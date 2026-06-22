import { defineStore } from 'pinia';
import { ref } from 'vue';
import { advancePlayhead } from '@/core/playback';

/**
 * Transient playback state. The playhead (`currentTime`, seconds) is pointer-
 * frequency during scrub and rAF-frequency during playback, so it lives outside
 * the document model in plain refs — never deep reactivity (two-tier state
 * rule). `playing`/`loop` are transport flags; `tick` advances the playhead
 * each frame via the pure `advancePlayhead`. The rAF driver lives in the
 * `usePlaybackLoop` composable, keeping this store free of side effects.
 *
 * Duration is owned by the document store, so the play/seek helpers that need
 * it take it as an argument rather than coupling the two stores.
 */
export const usePlaybackStore = defineStore('playback', () => {
  const currentTime = ref(0);
  const playing = ref(false);
  const loop = ref(true);

  function setCurrentTime(seconds: number): void {
    currentTime.value = Math.max(0, seconds);
  }

  /** Begin playback. If parked at the end (not looping), restart from zero. */
  function play(duration: number): void {
    if (!loop.value && currentTime.value >= duration) currentTime.value = 0;
    playing.value = true;
  }

  function pause(): void {
    playing.value = false;
  }

  function toggle(duration: number): void {
    if (playing.value) pause();
    else play(duration);
  }

  /** Stop and rewind to the start. */
  function stop(): void {
    playing.value = false;
    currentTime.value = 0;
  }

  /** Rewind to the start, leaving the play state untouched. */
  function rewind(): void {
    currentTime.value = 0;
  }

  function setLoop(value: boolean): void {
    loop.value = value;
  }

  function toggleLoop(): void {
    loop.value = !loop.value;
  }

  /** Advance one frame; pauses automatically at the end when not looping. */
  function tick(deltaSeconds: number, duration: number): void {
    const next = advancePlayhead(currentTime.value, deltaSeconds, duration, loop.value);
    currentTime.value = next.time;
    playing.value = next.playing;
  }

  return {
    currentTime,
    playing,
    loop,
    setCurrentTime,
    play,
    pause,
    toggle,
    stop,
    rewind,
    setLoop,
    toggleLoop,
    tick,
  };
});
