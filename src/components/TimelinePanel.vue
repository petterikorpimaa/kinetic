<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { usePlaybackLoop } from '@/composables/usePlaybackLoop';
import { useVerticalResize } from '@/composables/useVerticalResize';
import { timeToFraction } from '@/core/timeline';
import TransportControls from './TransportControls.vue';
import TimelineRuler from './TimelineRuler.vue';
import TimelineTrack from './TimelineTrack.vue';

// Timeline (M3, Epic 7/9): transport, scrubbable ruler, and a lane per active
// property of the selected element, with a shared playhead spanning both. The
// rAF playback loop is mounted here, once.
const store = useDocumentStore();
const playback = usePlaybackStore();

usePlaybackLoop();

// Drag the top edge to resize the panel (SVG-109). Matches the --timeline-height
// token default; the drag overrides that var transiently.
const DEFAULT_TIMELINE_HEIGHT = 238;
const {
  height: panelHeight,
  dragging: resizing,
  onHandlePointerDown,
} = useVerticalResize(DEFAULT_TIMELINE_HEIGHT);

const selectedId = computed(() => store.document.selectedElementId);
const tracks = computed(() => (selectedId.value ? store.tracksForElement(selectedId.value) : []));
const hasSelection = computed(() => selectedId.value !== null);
const hasTracks = computed(() => tracks.value.length > 0);
const emptyMessage = computed(() =>
  hasSelection.value
    ? 'No animated properties yet — add a property in the Inspector to create tracks.'
    : 'Select a shape to view and animate its tracks.',
);

const duration = computed(() => store.document.duration);
// Offset by the label column so the line aligns with the ruler and lanes.
const playheadLeft = computed(
  () =>
    `calc(var(--lane-col-width) + (100% - var(--lane-col-width)) * ${timeToFraction(
      playback.currentTime,
      duration.value,
    )})`,
);

const MARQUEE_THRESHOLD_PX = 2;
const tracksRef = ref<HTMLElement>();
// Marquee box in tracks-local pixels while a drag-select is in flight.
const marquee = ref<{ left: number; top: number; width: number; height: number } | null>(null);

interface ClientRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Keyframe ids whose rendered diamond intersects a client-space rect. */
function keyframesInRect(rect: ClientRect): string[] {
  const container = tracksRef.value;
  if (container === undefined) return [];
  const ids: string[] = [];
  container.querySelectorAll<HTMLElement>('[data-keyframe-id]').forEach((el) => {
    const box = el.getBoundingClientRect();
    const hit =
      box.left <= rect.right &&
      box.right >= rect.left &&
      box.top <= rect.bottom &&
      box.bottom >= rect.top;
    if (hit) {
      const id = el.getAttribute('data-keyframe-id');
      if (id !== null) ids.push(id);
    }
  });
  return ids;
}

/**
 * Drag a box over the lanes to select the keyframes it touches (additive with a
 * modifier). A press that never moves clears the selection. Only starts inside a
 * lane — keyframe diamonds stop propagation, so grabbing one never box-selects.
 */
function startMarquee(event: PointerEvent): void {
  if (event.button !== 0) return;
  const target = event.target as HTMLElement;
  if (target.closest('.track__lane') === null) return;
  const container = tracksRef.value;
  if (container === undefined) return;

  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;

  function rectFrom(x: number, y: number): ClientRect {
    return {
      left: Math.min(startX, x),
      top: Math.min(startY, y),
      right: Math.max(startX, x),
      bottom: Math.max(startY, y),
    };
  }

  function onMove(move: PointerEvent): void {
    if (Math.abs(move.clientX - startX) > MARQUEE_THRESHOLD_PX) moved = true;
    if (Math.abs(move.clientY - startY) > MARQUEE_THRESHOLD_PX) moved = true;
    if (!moved) return;
    const rect = rectFrom(move.clientX, move.clientY);
    const base = container!.getBoundingClientRect();
    marquee.value = {
      left: rect.left - base.left,
      top: rect.top - base.top,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
    };
  }

  function onUp(up: PointerEvent): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (moved) store.selectKeyframes(keyframesInRect(rectFrom(up.clientX, up.clientY)), additive);
    else if (!additive) store.clearKeyframeSelection();
    marquee.value = null;
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
</script>

<template>
  <section
    class="timeline"
    :class="{ 'timeline--resizing': resizing }"
    :style="{ '--timeline-height': `${panelHeight}px` }"
    data-testid="timeline-panel"
  >
    <div
      class="timeline__resize"
      title="Drag to resize"
      data-testid="timeline-resize"
      @pointerdown="onHandlePointerDown"
    />
    <TransportControls />

    <div ref="tracksRef" class="tracks">
      <div class="tracks__head">
        <div class="tracks__label-col">Tracks</div>
        <TimelineRuler />
      </div>

      <div class="tracks__body" @pointerdown="startMarquee">
        <template v-if="hasTracks">
          <TimelineTrack v-for="track in tracks" :key="track.id" :track="track" />
        </template>
        <div v-else class="tracks__empty" data-testid="timeline-empty">{{ emptyMessage }}</div>
      </div>

      <div
        v-if="hasTracks"
        class="tracks__playhead"
        data-testid="timeline-playhead"
        :style="{ left: playheadLeft }"
      />

      <div
        v-if="marquee"
        class="tracks__marquee"
        data-testid="timeline-marquee"
        :style="{
          left: `${marquee.left}px`,
          top: `${marquee.top}px`,
          width: `${marquee.width}px`,
          height: `${marquee.height}px`,
        }"
      />
    </div>
  </section>
</template>

<style scoped>
.timeline {
  height: var(--timeline-height);
  flex: none;
  border-top: 1px solid var(--line);
  background: var(--panel2);
  display: flex;
  flex-direction: column;
  position: relative;
}

.timeline__resize {
  position: absolute;
  top: -3px;
  left: 0;
  right: 0;
  height: 7px;
  cursor: row-resize;
  z-index: 9;
}

.timeline__resize::after {
  content: '';
  position: absolute;
  inset: 3px 0 auto;
  height: 1px;
  background: transparent;
  transition: background 0.12s;
}

.timeline__resize:hover::after,
.timeline--resizing .timeline__resize::after {
  background: var(--acc);
}

.tracks {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.tracks__head {
  height: var(--tracks-header-height);
  flex: none;
  display: flex;
  border-bottom: 1px solid var(--line);
}

.tracks__label-col {
  width: var(--lane-col-width);
  flex: none;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-right: 1px solid var(--line);
  background: var(--panel);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim2);
  font-weight: 700;
}

.tracks__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.tracks__empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dim2);
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

/* Spans the ruler header and the lanes; never intercepts pointer events. */
.tracks__playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--acc2);
  pointer-events: none;
  z-index: 2;
}

.tracks__playhead::before {
  content: '';
  position: absolute;
  top: 0;
  left: -3px;
  border-left: 3.5px solid transparent;
  border-right: 3.5px solid transparent;
  border-top: 5px solid var(--acc2);
}

.tracks__marquee {
  position: absolute;
  z-index: 3;
  border: 1px solid var(--acc);
  background: #14b8a61f;
  pointer-events: none;
}
</style>
