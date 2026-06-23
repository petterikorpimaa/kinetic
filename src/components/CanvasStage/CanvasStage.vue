<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, nextTick } from 'vue';
import { Clapperboard, Grid3x3, Grip, Square, ChevronDown, RotateCcw } from '@lucide/vue';
import { useDocumentStore, type ElementMetric } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import type { SceneElement } from '@/types/element';
import {
  type Camera,
  DEFAULT_CAMERA,
  zoomByWheel,
  panBy,
  isViewChanged,
  zoomPercent,
} from '@/core/camera';
import {
  computeElementVisual,
  applyElementVisual,
  type NodeBaseline,
  type ElementVisual,
} from '@/core/elementVisual';
import styles from './CanvasStage.module.css';

// Renders the inlined SVG: click-to-select, wheel zoom + drag pan (M1, Epic 4),
// per-element visibility, one-time metadata capture (bbox centre, path length),
// and `apply(t)` — writing each element's animated transform/opacity/fill/draw
// at the current playhead so Inspector edits show live (M2, Epic 4).
type BgPattern = 'Grid' | 'Dots' | 'Plain';
const DEFAULT_BG = '#0d0d14';
const PATTERN_ICON = { Grid: Grid3x3, Dots: Grip, Plain: Square } as const;
const PAN_THRESHOLD_PX = 2;

const store = useDocumentStore();
const playback = usePlaybackStore();

// Live node refs + their original attributes, rebuilt on each (re)mount. The
// baseline lets us restore an element when a property is removed or animation
// is disabled, instead of leaving the last animated value stuck on the node.
const nodeById = new Map<string, SVGGraphicsElement>();
const baselineById = new Map<string, NodeBaseline>();

const debug = ref(false);
const bgPattern = ref<BgPattern>('Grid');
const bgMenuOpen = ref(false);
const bgColor = ref(DEFAULT_BG);

const hostRef = ref<HTMLElement>();
const svgMarkup = computed(() => store.document.svgMarkup);
const selectedId = computed(() => store.document.selectedElementId);

// Camera is transient view state — kept out of the document, history, export.
const camera = shallowRef<Camera>(DEFAULT_CAMERA);
const isPanning = ref(false);
const viewChanged = computed(() => isViewChanged(camera.value));
const zoomPct = computed(() => zoomPercent(camera.value));
const cameraStyle = computed(() => ({
  transform: `translate(${camera.value.panX}px, ${camera.value.panY}px) scale(${camera.value.zoom})`,
}));

const viewBoxText = computed(() => {
  const { x, y, w, h } = store.document.viewBox;
  return `${x} ${y} ${w} ${h}`;
});

function onWheelZoom(event: WheelEvent): void {
  camera.value = zoomByWheel(camera.value, event.deltaY);
}

function resetView(): void {
  camera.value = DEFAULT_CAMERA;
}

// Drag to pan. Distinguish a click (no movement → clear selection) from a pan.
// Shape pointerdowns stopPropagation, so grabbing a shape never starts a pan.
function startPan(event: PointerEvent): void {
  if (event.button !== 0) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const base = camera.value;
  let moved = false;
  isPanning.value = true;

  function onMove(move: PointerEvent): void {
    const dx = move.clientX - startX;
    const dy = move.clientY - startY;
    if (Math.abs(dx) > PAN_THRESHOLD_PX || Math.abs(dy) > PAN_THRESHOLD_PX) moved = true;
    camera.value = panBy(base, dx, dy);
  }

  function onUp(): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    isPanning.value = false;
    if (!moved) store.selectElement(null);
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

const stageStyle = computed(() => {
  const color = bgColor.value;
  if (bgPattern.value === 'Plain') return { background: color };
  if (bgPattern.value === 'Dots') {
    return {
      background: `radial-gradient(circle at 1px 1px, #ffffff1f 1px, transparent 0) 0 0 / 22px 22px, ${color}`,
    };
  }
  return {
    background: `linear-gradient(#ffffff12 1px, transparent 1px) 0 0 / 22px 22px,
      linear-gradient(90deg, #ffffff12 1px, transparent 1px) 0 0 / 22px 22px, ${color}`,
  };
});

function applyOutline(): void {
  const host = hostRef.value;
  if (!host) return;
  host.querySelectorAll<SVGElement>('[data-anim-id]').forEach((node) => {
    const isSelected = node.getAttribute('data-anim-id') === selectedId.value;
    node.style.outline = isSelected ? '1.5px solid var(--acc)' : 'none';
    node.style.outlineOffset = isSelected ? '3px' : '0';
  });
}

// Measure geometry from the live node: bbox centre → transform origin,
// getTotalLength → path length. Both can throw on unrenderable nodes; fall back
// to zero rather than crashing the mount.
function measureNode(node: SVGGraphicsElement, id: string): ElementMetric {
  let x = 0;
  let y = 0;
  let pathLength = 0;
  try {
    const box = node.getBBox();
    x = box.x + box.width / 2;
    y = box.y + box.height / 2;
  } catch {
    // Non-rendered node — keep the zero origin.
  }
  const geometry = node as SVGGeometryElement;
  if (typeof geometry.getTotalLength === 'function') {
    try {
      pathLength = geometry.getTotalLength();
    } catch {
      // Some shapes expose getTotalLength but throw; keep length 0.
    }
  }
  return { id, transformOrigin: { x, y }, pathLength };
}

function applyVisibility(): void {
  const host = hostRef.value;
  if (!host) return;
  host.querySelectorAll<SVGElement>('[data-anim-id]').forEach((node) => {
    const id = node.getAttribute('data-anim-id');
    node.style.display = id !== null && store.isElementHidden(id) ? 'none' : '';
  });
}

// Disabling animation restores the imported baseline: no transform, original
// opacity/fill/filter, dash cleared.
function baselineVisual(base: NodeBaseline): ElementVisual {
  return {
    transform: base.transform,
    opacity: base.opacity,
    fill: base.fill,
    strokeDasharray: '',
    strokeDashoffset: '',
    filter: base.filter,
  };
}

function applyElement(node: SVGGraphicsElement, element: SceneElement, time: number): void {
  const base = baselineById.get(element.id);
  if (base === undefined) return;
  const visual = debug.value
    ? baselineVisual(base)
    : computeElementVisual(element, store.tracksForElement(element.id), time, base);
  applyElementVisual(node, visual);
}

// Write every element's animated values at the current playhead. The editor
// preview reads from the same samplers as export will (architecture rule 1).
function applyAnimation(): void {
  const time = playback.currentTime;
  for (const element of store.document.elements) {
    const node = nodeById.get(element.id);
    if (node !== undefined) applyElement(node, element, time);
  }
}

function mountSvg(): void {
  const host = hostRef.value;
  if (!host) return;
  const svg = host.querySelector('svg');
  if (!svg) return;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  Object.assign(svg.style, {
    width: '100%',
    height: '100%',
    overflow: 'visible',
  });

  nodeById.clear();
  baselineById.clear();
  const metrics: ElementMetric[] = [];
  host.querySelectorAll<SVGGraphicsElement>('[data-anim-id]').forEach((node) => {
    const id = node.getAttribute('data-anim-id');
    if (id === null) return;
    node.style.cursor = 'pointer';
    node.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      store.selectElement(id);
    });
    nodeById.set(id, node);
    baselineById.set(id, {
      transform: node.getAttribute('transform'),
      opacity: node.getAttribute('opacity'),
      fill: node.getAttribute('fill'),
      filter: node.style.filter,
    });
    metrics.push(measureNode(node, id));
  });
  store.captureElementMetrics(metrics);
  applyVisibility();
  applyAnimation();
  applyOutline();
}

watch(svgMarkup, () => nextTick(mountSvg));
watch(selectedId, applyOutline);
watch(() => store.hiddenElementIds, applyVisibility);
watch(() => store.document.tracks, applyAnimation);
watch(() => playback.currentTime, applyAnimation);
watch(debug, applyAnimation);
onMounted(() => nextTick(mountSvg));

function setPattern(pattern: BgPattern): void {
  bgPattern.value = pattern;
  bgMenuOpen.value = false;
}
</script>

<template>
  <section :class="styles.canvas" data-testid="canvas-stage">
    <div :class="styles.controls">
      <button
        type="button"
        :class="[styles.ctrl, debug ? styles.active : '']"
        title="Disable animation to show the original SVG for easier shape selection"
        @click="debug = !debug"
      >
        <Clapperboard :size="14" :stroke-width="1.3" />
        Disable animation
      </button>

      <div :class="styles.ctrlWrap">
        <button
          type="button"
          :class="styles.ctrl"
          title="Background pattern"
          @click="bgMenuOpen = !bgMenuOpen"
        >
          <component :is="PATTERN_ICON[bgPattern]" :size="15" :stroke-width="1.2" />
          <span>{{ bgPattern }}</span>
          <ChevronDown
            :size="11"
            :stroke-width="1.5"
            :class="[styles.chev, bgMenuOpen ? styles.open : '']"
          />
        </button>
        <template v-if="bgMenuOpen">
          <div :class="styles.backdrop" @click="bgMenuOpen = false" />
          <div :class="styles.menu">
            <button type="button" :class="styles.item" @click="setPattern('Grid')">
              <Grid3x3 :size="15" :stroke-width="1.2" />Grid
            </button>
            <button type="button" :class="styles.item" @click="setPattern('Dots')">
              <Grip :size="15" :stroke-width="1.2" />Dots
            </button>
            <button type="button" :class="styles.item" @click="setPattern('Plain')">
              <Square :size="15" :stroke-width="1.3" />Plain
            </button>
          </div>
        </template>
      </div>

      <label :class="[styles.ctrl, styles.color]" title="Background color">
        <span :class="styles.swatch" :style="{ background: bgColor }" />
        <span :class="styles.hex">{{ bgColor }}</span>
        <input
          type="color"
          :value="bgColor"
          :class="styles.colorInput"
          @input="bgColor = ($event.target as HTMLInputElement).value"
        />
      </label>

      <button
        type="button"
        :class="[styles.ctrl, styles.icon]"
        title="Reset background color"
        @click="bgColor = DEFAULT_BG"
      >
        <RotateCcw :size="14" :stroke-width="1.4" />
      </button>
    </div>

    <div
      :class="[styles.viewport, isPanning ? styles.panning : '']"
      data-testid="canvas-viewport"
      @wheel.prevent="onWheelZoom"
      @pointerdown="startPan"
    >
      <div :class="styles.camera" :style="cameraStyle">
        <div :class="styles.stage" :style="stageStyle">
          <div v-if="svgMarkup" ref="hostRef" :class="styles.svgHost" v-html="svgMarkup" />
          <p v-else :class="styles.hint">Import an SVG to start animating.</p>
        </div>
      </div>
    </div>

    <div :class="styles.viewbox">{{ viewBoxText }}</div>

    <div v-if="viewChanged" :class="styles.view" data-testid="view-indicator">
      <span :class="styles.zoom">{{ zoomPct }}%</span>
      <button type="button" :class="styles.reset" data-testid="reset-view" @click="resetView">
        Reset view
      </button>
    </div>
  </section>
</template>
