<script setup lang="ts">
import { computed } from 'vue';
import { SkipBack, Play, Pause, Repeat } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';

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
  <div class="transport">
    <button
      type="button"
      class="transport__btn"
      title="Back to start"
      data-testid="transport-rewind"
      @click="playback.rewind()"
    >
      <SkipBack :size="14" fill="currentColor" :stroke-width="0" />
    </button>
    <button
      type="button"
      class="transport__play"
      :title="playback.playing ? 'Pause' : 'Play'"
      data-testid="transport-play"
      @click="playback.toggle(duration)"
    >
      <Pause v-if="playback.playing" :size="15" fill="currentColor" :stroke-width="0" />
      <Play v-else :size="15" fill="currentColor" :stroke-width="0" />
    </button>
    <button
      type="button"
      class="transport__btn"
      :class="{ 'transport__btn--active': playback.loop }"
      title="Loop"
      data-testid="transport-loop"
      @click="playback.toggleLoop()"
    >
      <Repeat :size="15" :stroke-width="1.5" />
    </button>

    <div class="transport__time">
      <span class="transport__now" data-testid="transport-time">{{ nowText }}</span>
      <span class="transport__dur">/ {{ durationText }}</span>
    </div>

    <div class="transport__spacer" />

    <div class="transport__duration">
      <span class="transport__duration-label">Duration</span>
      <input
        type="number"
        min="0.5"
        max="12"
        step="0.5"
        :value="duration"
        class="transport__duration-input"
        data-testid="duration-input"
        @change="onDuration"
      />
      <span class="transport__duration-unit">s</span>
    </div>
  </div>
</template>

<style scoped>
.transport {
  height: var(--transport-height);
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
}

.transport__btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--txt);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transport__btn--active {
  color: var(--acc2);
  border-color: var(--acc);
}

.transport__btn:hover {
  color: var(--acc2);
  border-color: var(--dim2);
}

.transport__btn:active {
  transform: translateY(1px);
}

.transport__play {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--acc);
  background: var(--acc);
  color: #0b0b14;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px -4px var(--acc);
}

.transport__play:hover {
  filter: brightness(1.08);
}

.transport__play:active {
  transform: translateY(1px);
}

.transport__time {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-left: 6px;
  font-family: var(--font-mono);
}

.transport__now {
  font-size: 16px;
  font-weight: 600;
  color: var(--txt);
}

.transport__dur {
  font-size: 12px;
  color: var(--dim2);
}

.transport__spacer {
  flex: 1;
}

.transport__duration {
  display: flex;
  align-items: center;
  gap: 7px;
}

.transport__duration-label {
  font-size: 11px;
  color: var(--dim2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.transport__duration-input {
  width: 64px;
  height: 30px;
  padding: 0 9px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--track);
  color: var(--txt);
  font-size: 12px;
  outline: none;
  text-align: right;
}

.transport__duration-unit {
  font-size: 12px;
  color: var(--dim2);
  font-family: var(--font-mono);
}
</style>
