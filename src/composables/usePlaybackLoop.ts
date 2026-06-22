import { watch } from 'vue';
import { useRafFn } from '@vueuse/core';
import { usePlaybackStore } from '@/stores/playback';
import { useDocumentStore } from '@/stores/document';

/** Cap per-frame dt so a long stall (tab backgrounded) can't leap the playhead. */
const MAX_FRAME_SECONDS = 1 / 15;

/**
 * Drives the playhead while playing. Each animation frame advances the playback
 * store by the real elapsed time, sourcing duration from the document. The rAF
 * side effect lives here so the store and `src/core` stay pure (architecture
 * rule 4). Call once from the timeline's setup; the loop pauses itself whenever
 * playback stops (including auto-stop at the end of a non-looping range).
 */
export function usePlaybackLoop(): void {
  const playback = usePlaybackStore();
  const documentStore = useDocumentStore();

  const { pause, resume } = useRafFn(
    ({ delta }) => {
      const deltaSeconds = Math.min(delta / 1000, MAX_FRAME_SECONDS);
      playback.tick(deltaSeconds, documentStore.document.duration);
    },
    { immediate: false },
  );

  watch(
    () => playback.playing,
    (playing) => (playing ? resume() : pause()),
    { immediate: true },
  );
}
