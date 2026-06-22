<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { getPropertyDef } from '@/core/properties';
import { sampleNumber, sampleColor } from '@/core/animation';
import { timeToFraction } from '@/core/timeline';
import type { AnyTrack, NumericTrack, ColorTrack } from '@/types/track';

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
  <div class="track" data-testid="timeline-track">
    <div class="track__label-col">
      <span class="track__name" :title="label">{{ label }}</span>
      <span class="track__count">{{ count }}</span>
      <button
        type="button"
        class="track__add"
        title="Add keyframe at playhead"
        data-testid="lane-add-keyframe"
        @click="addKeyframeAtPlayhead"
      >
        <Plus :size="13" :stroke-width="1.8" />
      </button>
    </div>
    <div ref="laneRef" class="track__lane" :class="{ 'track__lane--dragging': dragging }">
      <button
        v-for="keyframe in track.keyframes"
        :key="keyframe.id"
        type="button"
        class="kf"
        :class="{ 'kf--selected': store.isKeyframeSelected(keyframe.id) }"
        :style="{ left: `${leftPercent(keyframe)}%` }"
        data-testid="keyframe"
        :data-keyframe-id="keyframe.id"
        @pointerdown="onKeyframeDown($event, keyframe)"
      />
    </div>
  </div>
</template>

<style scoped>
.track {
  height: var(--lane-height);
  flex: none;
  display: flex;
  border-bottom: 1px solid var(--line);
}

.track__label-col {
  width: var(--lane-col-width);
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 14px;
  border-right: 1px solid var(--line);
  background: var(--panel);
}

.track__name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--txt);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track__count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--dim2);
}

.track__add {
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track__add:hover {
  color: var(--acc2);
  border-color: var(--acc);
}

.track__lane {
  flex: 1;
  position: relative;
  background: var(--lane);
}

.track__lane--dragging {
  cursor: ew-resize;
}

.kf {
  position: absolute;
  top: 50%;
  width: 11px;
  height: 11px;
  margin: -6px 0 0 -6px;
  padding: 0;
  border: 1px solid var(--acc);
  background: var(--track);
  transform: rotate(45deg);
  border-radius: 2px;
  cursor: pointer;
}

.kf:hover {
  background: var(--elev);
}

.kf--selected {
  background: var(--acc);
  border-color: var(--acc2);
  box-shadow: 0 0 0 2px #14b8a64d;
}
</style>
