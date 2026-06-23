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
import SectionLabel from '@/atoms/SectionLabel/SectionLabel.vue';
import EmptyState from '@/atoms/EmptyState/EmptyState.vue';
import Chip from '@/atoms/Chip/Chip.vue';
import styles from './EasingEditor.module.css';

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
  <section :class="styles.easing" data-testid="easing-editor">
    <button type="button" :class="styles.head" @click="open = !open">
      <SectionLabel>Easing</SectionLabel>
      <span v-if="headerLabel" :class="styles.badge" data-testid="easing-label">{{
        headerLabel
      }}</span>
      <ChevronDown :size="13" :stroke-width="1.6" :class="[styles.chev, open ? styles.open : '']" />
    </button>

    <div v-if="open" :class="styles.body">
      <EmptyState v-if="count === 0" bordered :class="styles.prompt" data-testid="easing-empty">
        Select a keyframe on the timeline to edit its easing.
      </EmptyState>

      <template v-else>
        <svg
          v-if="count === 1"
          ref="svgRef"
          :class="styles.curve"
          :viewBox="`0 0 ${SIZE} ${SIZE}`"
          data-testid="easing-curve"
        >
          <line :class="styles.axis" :x1="origin.x" :y1="0" :x2="origin.x" :y2="SIZE" />
          <line :class="styles.axis" :x1="0" :y1="origin.y" :x2="SIZE" :y2="origin.y" />
          <line
            :class="styles.guide"
            :x1="origin.x"
            :y1="origin.y"
            :x2="endPoint.x"
            :y2="endPoint.y"
          />
          <line
            :class="styles.handleLine"
            :x1="origin.x"
            :y1="origin.y"
            :x2="handle1.x"
            :y2="handle1.y"
          />
          <line
            :class="styles.handleLine"
            :x1="endPoint.x"
            :y1="endPoint.y"
            :x2="handle2.x"
            :y2="handle2.y"
          />
          <path :class="styles.path" :d="path" />
          <circle
            :class="styles.handle"
            :cx="handle1.x"
            :cy="handle1.y"
            :r="HANDLE_RADIUS"
            data-testid="easing-handle-1"
            @pointerdown="startHandleDrag(1, $event)"
          />
          <circle
            :class="styles.handle"
            :cx="handle2.x"
            :cy="handle2.y"
            :r="HANDLE_RADIUS"
            data-testid="easing-handle-2"
            @pointerdown="startHandleDrag(2, $event)"
          />
        </svg>

        <EmptyState v-else bordered :class="styles.prompt" data-testid="easing-multi">
          {{ count }} keyframes selected — pick a preset to apply to all.
        </EmptyState>

        <div :class="styles.presets">
          <Chip
            v-for="preset in presets"
            :key="preset.name"
            :active="activePresetName === preset.name"
            :data-testid="`easing-preset-${preset.name}`"
            @click="applyPreset(preset.value)"
          >
            {{ preset.name }}
          </Chip>
        </div>

        <div :class="styles.readout" data-testid="easing-readout">{{ cssText }}</div>
      </template>
    </div>
  </section>
</template>
