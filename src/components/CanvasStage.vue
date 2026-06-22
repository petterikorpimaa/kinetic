<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, nextTick } from 'vue';
import { Clapperboard, Grid3x3, Grip, Square, ChevronDown, RotateCcw } from '@lucide/vue';
import { useDocumentStore, type ElementMetric } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import type { SceneElement } from '@/types/element';
import type { NumericTrack, ColorTrack, AnyTrack, NumericProperty } from '@/types/track';
import {
  type Camera,
  DEFAULT_CAMERA,
  zoomByWheel,
  panBy,
  isViewChanged,
  zoomPercent,
} from '@/core/camera';
import { sampleNumber, sampleColor, composeTransform, strokeDashOffset } from '@/core/animation';
import { scalarFilterCss, dropShadowCss, composeFilter, SCALAR_FILTERS } from '@/core/filters';
import { getPropertyDef } from '@/core/properties';

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
interface NodeBaseline {
  readonly transform: string | null;
  readonly opacity: string | null;
  readonly fill: string | null;
  readonly filter: string;
}
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

function setAttr(node: SVGGraphicsElement, name: string, value: string | null): void {
  if (value === null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}

// A track's value kind is fixed by its property, so these reads are sound.
function numberTrack(tracks: readonly AnyTrack[], property: string): NumericTrack | undefined {
  return tracks.find((track) => track.property === property) as NumericTrack | undefined;
}
function colorTrack(tracks: readonly AnyTrack[], property: string): ColorTrack | undefined {
  return tracks.find((track) => track.property === property) as ColorTrack | undefined;
}

function applyTransform(
  node: SVGGraphicsElement,
  element: SceneElement,
  tracks: readonly AnyTrack[],
  time: number,
  base: NodeBaseline,
): void {
  const xTrack = numberTrack(tracks, 'x');
  const yTrack = numberTrack(tracks, 'y');
  const scaleTrack = numberTrack(tracks, 'scale');
  const rotationTrack = numberTrack(tracks, 'rotation');
  if (!xTrack && !yTrack && !scaleTrack && !rotationTrack) {
    setAttr(node, 'transform', base.transform);
    return;
  }
  const transform = composeTransform(element.transformOrigin, {
    x: sampleNumber(xTrack, time, 0),
    y: sampleNumber(yTrack, time, 0),
    scale: sampleNumber(scaleTrack, time, 1),
    rotation: sampleNumber(rotationTrack, time, 0),
  });
  node.setAttribute('transform', transform);
}

function applyDraw(
  node: SVGGraphicsElement,
  element: SceneElement,
  drawTrack: NumericTrack | undefined,
  time: number,
): void {
  if (!drawTrack) {
    node.style.strokeDasharray = '';
    node.style.strokeDashoffset = '';
    return;
  }
  const length = element.pathLength || 0;
  node.style.strokeDasharray = String(length);
  node.style.strokeDashoffset = String(
    strokeDashOffset(length, sampleNumber(drawTrack, time, 100)),
  );
}

function numericDefault(property: NumericProperty): number {
  const def = getPropertyDef(property);
  return def !== undefined && def.kind === 'number' ? def.defaultValue : 0;
}

// Compose the element's `filter` from its active filter tracks (scalar filters
// in canonical order, then drop-shadow), restoring the baseline when none.
function applyFilters(
  node: SVGGraphicsElement,
  tracks: readonly AnyTrack[],
  time: number,
  base: NodeBaseline,
): void {
  const parts: string[] = [];
  for (const filter of SCALAR_FILTERS) {
    const track = numberTrack(tracks, filter);
    if (track !== undefined) {
      parts.push(scalarFilterCss(filter, sampleNumber(track, time, numericDefault(filter))));
    }
  }
  const shadowX = numberTrack(tracks, 'shadowX');
  const shadowY = numberTrack(tracks, 'shadowY');
  const shadowColor = colorTrack(tracks, 'shadowColor');
  if (shadowX !== undefined || shadowY !== undefined || shadowColor !== undefined) {
    parts.push(
      dropShadowCss(
        sampleNumber(shadowX, time, numericDefault('shadowX')),
        sampleNumber(shadowY, time, numericDefault('shadowY')),
        sampleColor(shadowColor, time, '#000000'),
      ),
    );
  }
  node.style.filter = parts.length > 0 ? composeFilter(parts) : base.filter;
}

function applyElement(node: SVGGraphicsElement, element: SceneElement, time: number): void {
  const base = baselineById.get(element.id);
  if (base === undefined) return;
  if (debug.value) {
    setAttr(node, 'transform', base.transform);
    setAttr(node, 'opacity', base.opacity);
    setAttr(node, 'fill', base.fill);
    node.style.strokeDasharray = '';
    node.style.strokeDashoffset = '';
    node.style.filter = base.filter;
    return;
  }
  const tracks = store.tracksForElement(element.id);
  applyTransform(node, element, tracks, time, base);

  const opacityTrack = numberTrack(tracks, 'opacity');
  setAttr(
    node,
    'opacity',
    opacityTrack ? String(sampleNumber(opacityTrack, time, 1)) : base.opacity,
  );

  const fillTrack = colorTrack(tracks, 'fill');
  setAttr(
    node,
    'fill',
    fillTrack ? sampleColor(fillTrack, time, base.fill ?? '#14b8a6') : base.fill,
  );

  applyDraw(node, element, numberTrack(tracks, 'draw'), time);
  applyFilters(node, tracks, time, base);
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
  <section class="canvas" data-testid="canvas-stage">
    <div class="canvas__controls">
      <button
        type="button"
        class="ctrl"
        :class="{ 'ctrl--active': debug }"
        title="Disable animation to show the original SVG for easier shape selection"
        @click="debug = !debug"
      >
        <Clapperboard :size="14" :stroke-width="1.3" />
        Disable animation
      </button>

      <div class="ctrl-wrap">
        <button
          type="button"
          class="ctrl"
          title="Background pattern"
          @click="bgMenuOpen = !bgMenuOpen"
        >
          <component :is="PATTERN_ICON[bgPattern]" :size="15" :stroke-width="1.2" />
          <span>{{ bgPattern }}</span>
          <ChevronDown
            :size="11"
            :stroke-width="1.5"
            class="ctrl__chev"
            :class="{ 'ctrl__chev--open': bgMenuOpen }"
          />
        </button>
        <template v-if="bgMenuOpen">
          <div class="ctrl__backdrop" @click="bgMenuOpen = false" />
          <div class="ctrl__menu">
            <button type="button" class="ctrl__item" @click="setPattern('Grid')">
              <Grid3x3 :size="15" :stroke-width="1.2" />Grid
            </button>
            <button type="button" class="ctrl__item" @click="setPattern('Dots')">
              <Grip :size="15" :stroke-width="1.2" />Dots
            </button>
            <button type="button" class="ctrl__item" @click="setPattern('Plain')">
              <Square :size="15" :stroke-width="1.3" />Plain
            </button>
          </div>
        </template>
      </div>

      <label class="ctrl ctrl--color" title="Background color">
        <span class="ctrl__swatch" :style="{ background: bgColor }" />
        <span class="ctrl__hex">{{ bgColor }}</span>
        <input
          type="color"
          :value="bgColor"
          class="ctrl__color-input"
          @input="bgColor = ($event.target as HTMLInputElement).value"
        />
      </label>

      <button
        type="button"
        class="ctrl ctrl--icon"
        title="Reset background color"
        @click="bgColor = DEFAULT_BG"
      >
        <RotateCcw :size="14" :stroke-width="1.4" />
      </button>
    </div>

    <div
      class="canvas__viewport"
      :class="{ 'canvas__viewport--panning': isPanning }"
      data-testid="canvas-viewport"
      @wheel.prevent="onWheelZoom"
      @pointerdown="startPan"
    >
      <div class="canvas__camera" :style="cameraStyle">
        <div class="canvas__stage" :style="stageStyle">
          <div v-if="svgMarkup" ref="hostRef" class="svg-host" v-html="svgMarkup" />
          <p v-else class="canvas__hint">Import an SVG to start animating.</p>
        </div>
      </div>
    </div>

    <div class="canvas__viewbox">{{ viewBoxText }}</div>

    <div v-if="viewChanged" class="canvas__view" data-testid="view-indicator">
      <span class="canvas__zoom">{{ zoomPct }}%</span>
      <button type="button" class="canvas__reset" data-testid="reset-view" @click="resetView">
        Reset view
      </button>
    </div>
  </section>
</template>

<style scoped>
.canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  background: radial-gradient(120% 120% at 50% 0%, var(--canvas-grad-a), var(--canvas-grad-b));
}

.canvas__controls {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-wrap {
  position: relative;
}

.ctrl {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 33px;
  padding: 0 11px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--glass);
  backdrop-filter: blur(6px);
  color: var(--dim);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.ctrl:hover {
  color: var(--txt);
}

.ctrl--active {
  color: var(--acc2);
  border-color: var(--acc);
}

.ctrl--icon,
.ctrl--color {
  padding: 0 9px;
}

.ctrl--icon {
  width: 33px;
  justify-content: center;
}

.ctrl__chev {
  transition: transform 0.15s;
}

.ctrl__chev--open {
  transform: rotate(180deg);
}

.ctrl__swatch {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1px solid #ffffff22;
}

.ctrl__hex {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  color: var(--dim);
}

.ctrl--color {
  position: relative;
}

.ctrl__color-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.ctrl__backdrop {
  position: fixed;
  inset: 0;
  z-index: 7;
}

.ctrl__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 8;
  width: 152px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 5px;
  box-shadow: 0 18px 50px -14px #000;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ctrl__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 9px;
  border-radius: 8px;
  border: none;
  background: none;
  color: var(--txt);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.ctrl__item:hover {
  background: var(--panel2);
}

.canvas__viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  cursor: grab;
}

.canvas__viewport--panning {
  cursor: grabbing;
}

.canvas__camera {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  will-change: transform;
}

.canvas__stage {
  width: min(70%, 460px);
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}

.svg-host {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: svg-enter 0.4s ease both;
}

/* Gentle entrance when a freshly imported SVG mounts. */
@keyframes svg-enter {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.canvas__hint {
  margin: 0;
  font-size: 12px;
  color: var(--dim2);
}

.canvas__viewbox {
  position: absolute;
  bottom: 14px;
  left: 16px;
  z-index: 6;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--dim2);
  background: var(--glass);
  backdrop-filter: blur(6px);
  border: 1px solid var(--line);
  padding: 5px 9px;
  border-radius: 8px;
  pointer-events: none;
}

.canvas__view {
  position: absolute;
  bottom: 14px;
  right: 16px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--glass);
  backdrop-filter: blur(6px);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 5px 6px 5px 11px;
}

.canvas__zoom {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--dim);
}

.canvas__reset {
  height: 24px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--txt);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.canvas__reset:hover {
  border-color: var(--acc);
}
</style>
