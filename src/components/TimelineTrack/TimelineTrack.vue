<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { getPropertyDef } from '@/core/properties';
import { sampleNumber, sampleColor } from '@/core/animation';
import { timeToFraction } from '@/core/timeline';
import type { AnyTrack, NumericTrack, ColorTrack } from '@/types/track';
import Button from '@/atoms/Button/Button.vue';
import styles from './TimelineTrack.module.css';

// One lane per active property (M3, Epic 7): label + count + add-keyframe,
// keyframe diamonds positioned by time, click-to-select (additive with a
// modifier), and drag-to-retime. The live drag offset is transient state
// (two-tier rule) and is committed to the store once, on pointer-up.
const props = defineProps<{ track: AnyTrack }>();
const store = useDocumentStore();
const playback = usePlaybackStore();
const laneRef = ref<HTMLElement>();

const DRAG_THRESHOLD_PX = 2;

const def = computed(() => getPropertyDef(props.track.property));
const label = computed(() => def.value?.label ?? props.track.property);
const count = computed(() => props.track.keyframes.length);
const duration = computed(() => store.document.duration);

const dragging = ref(false);
const dragSeconds = ref(0);

/** Horizontal position (%) of a keyframe, including the live drag preview. */
function leftPercent(keyframe: { id: string; time: number }): number {
  const shift = dragging.value && store.isKeyframeSelected(keyframe.id) ? dragSeconds.value : 0;
  return timeToFraction(keyframe.time + shift, duration.value) * 100;
}

function addKeyframeAtPlayhead(): void {
  const propertyDef = def.value;
  if (propertyDef === undefined) return;
  const time = playback.currentTime;
  if (propertyDef.kind === 'color') {
    const value = sampleColor(props.track as ColorTrack, time, propertyDef.defaultValue);
    store.setColorValue(props.track.elementId, propertyDef.key, time, value);
  } else {
    const value = sampleNumber(props.track as NumericTrack, time, propertyDef.defaultValue);
    store.setNumberValue(props.track.elementId, propertyDef.key, time, value);
  }
}

function onKeyframeDown(event: PointerEvent, keyframe: { id: string }): void {
  event.stopPropagation();
  if (event.button !== 0) return;
  const additive = event.shiftKey || event.metaKey || event.ctrlKey;

  if (!store.isKeyframeSelected(keyframe.id)) {
    store.selectKeyframe(keyframe.id, additive);
  } else if (additive) {
    store.selectKeyframe(keyframe.id, true); // toggle out of the selection — no drag
    return;
  }

  const lane = laneRef.value;
  const width = lane ? lane.getBoundingClientRect().width : 1;
  const startX = event.clientX;
  let moved = false;
  dragging.value = true;
  dragSeconds.value = 0;

  function onMove(move: PointerEvent): void {
    const dx = move.clientX - startX;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) moved = true;
    dragSeconds.value = (dx / width) * duration.value;
  }
  function onUp(): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (moved) store.moveSelectedKeyframes(dragSeconds.value, duration.value);
    dragging.value = false;
    dragSeconds.value = 0;
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
</script>

<template>
  <div :class="styles.track" data-testid="timeline-track">
    <div :class="styles.labelCol">
      <span :class="styles.name" data-testid="track-name" :title="label">{{ label }}</span>
      <span :class="styles.count" data-testid="track-count">{{ count }}</span>
      <Button
        variant="icon"
        :class="styles.add"
        title="Add keyframe at playhead"
        data-testid="lane-add-keyframe"
        @click="addKeyframeAtPlayhead"
      >
        <Plus :size="13" :stroke-width="1.8" />
      </Button>
    </div>
    <div ref="laneRef" data-lane :class="[styles.lane, dragging ? styles.dragging : '']">
      <button
        v-for="keyframe in track.keyframes"
        :key="keyframe.id"
        type="button"
        :class="[styles.kf, store.isKeyframeSelected(keyframe.id) ? styles.selected : '']"
        :style="{ left: `${leftPercent(keyframe)}%` }"
        data-testid="keyframe"
        :data-keyframe-id="keyframe.id"
        :data-selected="store.isKeyframeSelected(keyframe.id)"
        @pointerdown="onKeyframeDown($event, keyframe)"
      />
    </div>
  </div>
</template>
