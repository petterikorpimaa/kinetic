<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { buildTicks, fractionToTime } from '@/core/timeline';
import styles from './TimelineRuler.module.css';

// Adaptive tick ruler with click/drag scrubbing (M3, Epic 7). Scrubbing pauses
// playback and seeks the shared playhead; the playhead line is drawn by the
// parent so it spans both the ruler and the lanes.
const store = useDocumentStore();
const playback = usePlaybackStore();
const rulerRef = ref<HTMLElement>();

const duration = computed(() => store.document.duration);
const ticks = computed(() => buildTicks(duration.value));

function timeFromEvent(event: PointerEvent): number {
  const el = rulerRef.value;
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  return fractionToTime((event.clientX - rect.left) / rect.width, duration.value);
}

function startScrub(event: PointerEvent): void {
  if (event.button !== 0) return;
  playback.pause();
  playback.setCurrentTime(timeFromEvent(event));

  function onMove(move: PointerEvent): void {
    playback.setCurrentTime(timeFromEvent(move));
  }
  function onUp(): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
</script>

<template>
  <div ref="rulerRef" :class="styles.ruler" data-testid="timeline-ruler" @pointerdown="startScrub">
    <div
      v-for="(tick, i) in ticks"
      :key="i"
      :class="styles.tick"
      :style="{ left: `${tick.fraction * 100}%` }"
    >
      <span v-if="tick.label" :class="styles.label">{{ tick.label }}</span>
    </div>
  </div>
</template>
