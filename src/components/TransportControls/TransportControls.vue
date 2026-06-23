<script setup lang="ts">
import { computed } from 'vue';
import { SkipBack, Play, Pause, Repeat } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import Button from '@/atoms/Button/Button.vue';
import styles from './TransportControls.module.css';

// Transport row (M3, Epic 7/9): back-to-start, play/pause, loop, the live
// time/duration readout, and the duration input. All transport state lives in
// the playback store; duration is the document's.
const store = useDocumentStore();
const playback = usePlaybackStore();

const duration = computed(() => store.document.duration);
const nowText = computed(() => `${playback.currentTime.toFixed(2)}s`);
const durationText = computed(() => `${duration.value.toFixed(2)}s`);

function onDuration(event: Event): void {
  const value = Number.parseFloat((event.target as HTMLInputElement).value);
  if (!Number.isNaN(value)) store.setDuration(value);
}
</script>

<template>
  <div :class="styles.transport">
    <Button
      variant="icon"
      :class="styles.btn"
      title="Back to start"
      data-testid="transport-rewind"
      @click="playback.rewind()"
    >
      <SkipBack :size="14" fill="currentColor" :stroke-width="0" />
    </Button>
    <Button
      variant="solid"
      :class="styles.play"
      :title="playback.playing ? 'Pause' : 'Play'"
      data-testid="transport-play"
      @click="playback.toggle(duration)"
    >
      <Pause v-if="playback.playing" :size="15" fill="currentColor" :stroke-width="0" />
      <Play v-else :size="15" fill="currentColor" :stroke-width="0" />
    </Button>
    <Button
      variant="icon"
      :class="styles.btn"
      :active="playback.loop"
      title="Loop"
      data-testid="transport-loop"
      @click="playback.toggleLoop()"
    >
      <Repeat :size="15" :stroke-width="1.5" />
    </Button>

    <div :class="styles.time">
      <span :class="styles.now" data-testid="transport-time">{{ nowText }}</span>
      <span :class="styles.dur">/ {{ durationText }}</span>
    </div>

    <div :class="styles.spacer" />

    <div :class="styles.duration">
      <span :class="styles.durationLabel">Duration</span>
      <input
        type="number"
        min="0.5"
        max="12"
        step="0.5"
        :value="duration"
        :class="styles.durationInput"
        data-testid="duration-input"
        @change="onDuration"
      />
      <span :class="styles.durationUnit">s</span>
    </div>
  </div>
</template>
