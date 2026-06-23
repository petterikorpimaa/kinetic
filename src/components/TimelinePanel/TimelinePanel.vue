<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { usePlaybackLoop } from '@/composables/usePlaybackLoop';
import { useVerticalResize } from '@/composables/useVerticalResize';
import { timeToFraction } from '@/core/timeline';
import TransportControls from '../TransportControls/TransportControls.vue';
import TimelineRuler from '../TimelineRuler/TimelineRuler.vue';
import TimelineTrack from '../TimelineTrack/TimelineTrack.vue';
import SectionLabel from '@/atoms/SectionLabel/SectionLabel.vue';
import EmptyState from '@/atoms/EmptyState/EmptyState.vue';
import styles from './TimelinePanel.module.css';

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
  if (target.closest('[data-lane]') === null) return;
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
    :class="[styles.timeline, resizing ? styles.resizing : '']"
    :style="{ '--timeline-height': `${panelHeight}px` }"
    data-testid="timeline-panel"
  >
    <div
      :class="styles.resize"
      title="Drag to resize"
      data-testid="timeline-resize"
      @pointerdown="onHandlePointerDown"
    />
    <TransportControls />

    <div ref="tracksRef" :class="styles.tracks">
      <div :class="styles.head">
        <div :class="styles.labelCol"><SectionLabel>Tracks</SectionLabel></div>
        <TimelineRuler />
      </div>

      <div :class="styles.body" @pointerdown="startMarquee">
        <template v-if="hasTracks">
          <TimelineTrack v-for="track in tracks" :key="track.id" :track="track" />
        </template>
        <EmptyState v-else :class="styles.empty" data-testid="timeline-empty">{{
          emptyMessage
        }}</EmptyState>
      </div>

      <div
        v-if="hasTracks"
        :class="styles.playhead"
        data-testid="timeline-playhead"
        :style="{ left: playheadLeft }"
      />

      <div
        v-if="marquee"
        :class="styles.marquee"
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
