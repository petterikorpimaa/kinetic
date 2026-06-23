import { ref } from 'vue';

/**
 * Live offset (in seconds) of a keyframe drag in progress, or null when idle.
 *
 * Shared across every timeline lane so all selected keyframes preview the move
 * together — not just the lane the pointer grabbed. It's pointer-frequency
 * transient state, so it lives in a plain shared ref (two-tier rule), never the
 * document; the move is committed to the store once on drag-end.
 */
const offsetSeconds = ref<number | null>(null);

export function useKeyframeDrag() {
  function setOffset(seconds: number | null): void {
    offsetSeconds.value = seconds;
  }
  return { offsetSeconds, setOffset };
}
