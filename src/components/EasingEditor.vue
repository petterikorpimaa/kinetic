<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { EASING_PRESETS, matchPreset, DEFAULT_EASING } from '@/core/presets';
import {
  clampControlPoints,
  toViewBox,
  fromViewBox,
  curvePath,
  cubicBezierCss,
} from '@/core/easingCurve';
import type { CubicBezierEasing } from '@/types/easing';

// Easing editor (M4, Epic 8): a collapsible Inspector section that edits the
// outgoing-segment easing of the selected keyframe(s) (DEC-2). One keyframe →
// the draggable bezier curve; many → presets only; none → a prompt. The live
// drag is transient and committed once on pointer-up (two-tier state rule).
const SIZE = 100; // square viewBox side, in user units
const HANDLE_RADIUS = 5;

const store = useDocumentStore();
const open = ref(true);
const svgRef = ref<SVGSVGElement>();
const draft = ref<CubicBezierEasing | null>(null);

const presets = EASING_PRESETS;

const selectedKeyframes = computed(() => {
  const ids = store.selectedKeyframeIds;
  if (ids.size === 0) return [] as { id: string; easing: CubicBezierEasing }[];
  const result: { id: string; easing: CubicBezierEasing }[] = [];
  for (const track of store.document.tracks) {
    for (const keyframe of track.keyframes) {
      if (ids.has(keyframe.id)) result.push({ id: keyframe.id, easing: keyframe.easing });
    }
  }
  return result;
});
const count = computed(() => selectedKeyframes.value.length);

/** The easing shared by the whole selection, or null when they differ. */
const sharedEasing = computed<CubicBezierEasing | null>(() => {
  const keyframes = selectedKeyframes.value;
  if (keyframes.length === 0) return null;
  const first = keyframes[0]!.easing;
  const allSame = keyframes.every(
    (k) =>
      k.easing[0] === first[0] &&
      k.easing[1] === first[1] &&
      k.easing[2] === first[2] &&
      k.easing[3] === first[3],
  );
  return allSame ? first : null;
});

// The curve on screen: the in-flight drag draft, else the shared easing, else
// the default (so an empty/mixed selection still shows a sensible curve).
const current = computed<CubicBezierEasing>(
  () => draft.value ?? sharedEasing.value ?? DEFAULT_EASING,
);
const activePresetName = computed(() => matchPreset(current.value)?.name ?? null);

const headerLabel = computed(() => {
  if (count.value === 0) return '';
  if (draft.value === null && sharedEasing.value === null) return 'Mixed';
  return activePresetName.value ?? 'Custom';
});

const cssText = computed(() => cubicBezierCss(current.value));
const path = computed(() => curvePath(current.value, SIZE));
const handle1 = computed(() => toViewBox(current.value[0], current.value[1], SIZE));
const handle2 = computed(() => toViewBox(current.value[2], current.value[3], SIZE));
const origin = toViewBox(0, 0, SIZE);
const endPoint = toViewBox(1, 1, SIZE);

function applyEasing(easing: CubicBezierEasing): void {
  store.setEasingForSelection(clampControlPoints(easing));
}

function applyPreset(value: CubicBezierEasing): void {
  applyEasing([value[0], value[1], value[2], value[3]]);
}

function startHandleDrag(which: 1 | 2, event: PointerEvent): void {
  event.stopPropagation();
  if (event.button !== 0 || count.value === 0) return;
  const svg = svgRef.value;
  if (svg === undefined) return;
  // Prevent the drag from selecting surrounding Inspector text.
  event.preventDefault();
  document.body.style.userSelect = 'none';
  const base = current.value;

  function pointTo(move: PointerEvent): CubicBezierEasing {
    const rect = svg!.getBoundingClientRect();
    const view = fromViewBox(
      ((move.clientX - rect.left) / rect.width) * SIZE,
      ((move.clientY - rect.top) / rect.height) * SIZE,
      SIZE,
    );
    const next: CubicBezierEasing =
      which === 1 ? [view.x, view.y, base[2], base[3]] : [base[0], base[1], view.x, view.y];
    return clampControlPoints(next);
  }

  draft.value = base;
  function onMove(move: PointerEvent): void {
    draft.value = pointTo(move);
  }
  function onUp(up: PointerEvent): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.body.style.userSelect = '';
    const final = pointTo(up);
    draft.value = null;
    applyEasing(final);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
</script>

<template>
  <section class="easing" data-testid="easing-editor">
    <button type="button" class="easing__head" @click="open = !open">
      <span class="easing__title">Easing</span>
      <span v-if="headerLabel" class="easing__badge" data-testid="easing-label">{{
        headerLabel
      }}</span>
      <ChevronDown
        :size="13"
        :stroke-width="1.6"
        class="easing__chev"
        :class="{ 'easing__chev--open': open }"
      />
    </button>

    <div v-if="open" class="easing__body">
      <p v-if="count === 0" class="easing__empty" data-testid="easing-empty">
        Select a keyframe on the timeline to edit its easing.
      </p>

      <template v-else>
        <svg
          v-if="count === 1"
          ref="svgRef"
          class="easing__curve"
          :viewBox="`0 0 ${SIZE} ${SIZE}`"
          data-testid="easing-curve"
        >
          <line class="easing__axis" :x1="origin.x" :y1="0" :x2="origin.x" :y2="SIZE" />
          <line class="easing__axis" :x1="0" :y1="origin.y" :x2="SIZE" :y2="origin.y" />
          <line
            class="easing__guide"
            :x1="origin.x"
            :y1="origin.y"
            :x2="endPoint.x"
            :y2="endPoint.y"
          />
          <line
            class="easing__handle-line"
            :x1="origin.x"
            :y1="origin.y"
            :x2="handle1.x"
            :y2="handle1.y"
          />
          <line
            class="easing__handle-line"
            :x1="endPoint.x"
            :y1="endPoint.y"
            :x2="handle2.x"
            :y2="handle2.y"
          />
          <path class="easing__path" :d="path" />
          <circle
            class="easing__handle"
            :cx="handle1.x"
            :cy="handle1.y"
            :r="HANDLE_RADIUS"
            data-testid="easing-handle-1"
            @pointerdown="startHandleDrag(1, $event)"
          />
          <circle
            class="easing__handle"
            :cx="handle2.x"
            :cy="handle2.y"
            :r="HANDLE_RADIUS"
            data-testid="easing-handle-2"
            @pointerdown="startHandleDrag(2, $event)"
          />
        </svg>

        <p v-else class="easing__multi" data-testid="easing-multi">
          {{ count }} keyframes selected — pick a preset to apply to all.
        </p>

        <div class="easing__presets">
          <button
            v-for="preset in presets"
            :key="preset.name"
            type="button"
            class="easing__preset"
            :class="{ 'easing__preset--active': activePresetName === preset.name }"
            :data-testid="`easing-preset-${preset.name}`"
            @click="applyPreset(preset.value)"
          >
            {{ preset.name }}
          </button>
        </div>

        <div class="easing__readout" data-testid="easing-readout">{{ cssText }}</div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.easing {
  border-top: 1px solid var(--line);
  padding: 12px 14px 16px;
}

.easing__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: var(--txt);
  cursor: pointer;
}

.easing__title {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim2);
  font-weight: 700;
}

.easing__badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--acc2);
  font-family: var(--font-mono);
}

.easing__chev {
  margin-left: auto;
  color: var(--dim2);
  transition: transform 0.15s;
}

.easing__chev--open {
  transform: rotate(180deg);
}

.easing__body {
  margin-top: 12px;
}

.easing__empty,
.easing__multi {
  margin: 0 0 12px;
  padding: 14px;
  text-align: center;
  border: 1px dashed var(--line);
  border-radius: 11px;
  color: var(--dim2);
  font-size: 12px;
  line-height: 1.5;
}

.easing__curve {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  margin-bottom: 12px;
  background: var(--track);
  border: 1px solid var(--line);
  border-radius: 11px;
  overflow: visible;
}

.easing__axis {
  stroke: var(--line);
  stroke-width: 1;
}

.easing__guide {
  stroke: var(--dim2);
  stroke-width: 0.75;
  stroke-dasharray: 3 3;
  opacity: 0.55;
}

.easing__handle-line {
  stroke: var(--dim2);
  stroke-width: 0.5;
}

.easing__path {
  fill: none;
  stroke: var(--acc2);
  stroke-width: 2;
}

.easing__handle {
  fill: var(--acc);
  stroke: #fff;
  stroke-width: 1.5;
  cursor: grab;
  touch-action: none;
}

.easing__handle:active {
  cursor: grabbing;
}

.easing__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.easing__preset {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--dim);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.easing__preset:hover {
  color: var(--txt);
}

.easing__preset--active {
  color: var(--acc2);
  border-color: var(--acc);
  background: #14b8a61f;
}

.easing__readout {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--dim);
  text-align: center;
  word-break: break-all;
}
</style>
