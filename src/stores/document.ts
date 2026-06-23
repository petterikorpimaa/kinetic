import { defineStore } from 'pinia';
import { shallowRef, ref, computed } from 'vue';
import type { AnimationDocument } from '@/types';
import type { AnimatableProperty, NumericProperty, ColorProperty, AnyTrack } from '@/types/track';
import type { CubicBezierEasing } from '@/types/easing';
import { createEmptyDocument } from '@/types';
import { processSvg } from '@/core/processSvg';
import { SAMPLE_SVG, SAMPLE_FILE_NAME } from '@/core/sample';
import {
  buildSampleTracks,
  SAMPLE_SELECTED_ELEMENT_ID,
  SAMPLE_DURATION,
} from '@/core/sampleAnimation';
import { DEFAULT_EASING } from '@/core/presets';
import { snapTime, clampTime } from '@/core/timeline';
import { isPropertySupported } from '@/core/shapeProperties';
import { applyLayerMove, type DropPosition } from '@/core/reorderLayers';
import { produceWithPatches, type Draft } from '@/core/immer';
import {
  createHistory,
  record,
  undo as applyUndo,
  redo as applyRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
} from '@/core/history';

const MIN_DURATION = 0.5;
const MAX_DURATION = 12;
/** Keyframes within this distance of an edit time are updated in place. */
const KEYFRAME_SNAP_SECONDS = 0.04;

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Mutable, value-kind-erased view of a track for editing the Immer draft.
 * The document's public types are deeply `readonly` and kind-specific; the
 * draft is mutable at runtime, and the callers (setNumberValue / setColorValue)
 * guarantee `value` matches the property's kind. This local view lets us edit
 * in place without widening the public API to `any`.
 */
interface MutableKeyframe {
  id: string;
  time: number;
  value: number | string;
  easing: CubicBezierEasing;
}

interface MutableTrack {
  id: string;
  elementId: string;
  property: AnimatableProperty;
  keyframes: MutableKeyframe[];
}

/**
 * Upsert a keyframe at `time`: update the value of a keyframe already there
 * (within the snap window) or insert a new one (default easing) and re-sort.
 * Creates the track lazily if the property isn't active yet. Mutates the Immer
 * draft, so the change is captured for undo by the surrounding `commit`.
 */
function upsertKeyframe(
  draft: Draft<AnimationDocument>,
  elementId: string,
  property: AnimatableProperty,
  time: number,
  value: number | string,
): void {
  const tracks = draft.tracks as unknown as MutableTrack[];
  let track = tracks.find((t) => t.elementId === elementId && t.property === property);
  if (track === undefined) {
    tracks.push({ id: newId(), elementId, property, keyframes: [] });
    track = tracks[tracks.length - 1]!;
  }
  const existing = track.keyframes.findIndex(
    (keyframe) => Math.abs(keyframe.time - time) < KEYFRAME_SNAP_SECONDS,
  );
  if (existing >= 0) {
    track.keyframes[existing]!.value = value;
    return;
  }
  track.keyframes.push({ id: newId(), time, value, easing: DEFAULT_EASING });
  track.keyframes.sort((a, b) => a.time - b.time);
}

/** Measured geometry for one element, captured from the live SVG after inject. */
export interface ElementMetric {
  readonly id: string;
  readonly transformOrigin: { readonly x: number; readonly y: number };
  readonly pathLength: number;
}

/**
 * The document store holds the reactive `AnimationDocument` in a `shallowRef`:
 * the model is immutable and replaced wholesale on each commit, so we avoid
 * deep-reactivity re-render storms while still triggering updates (two-tier
 * state rule). Pointer-frequency state (scrub playhead, drag deltas) lives
 * elsewhere and is not part of this store.
 *
 * Every mutation goes through `commit`, which produces Immer patches and
 * records them for undo/redo. The undo/redo UI lands in M6, but the machinery
 * is wired in from day one.
 */
export const useDocumentStore = defineStore('document', () => {
  const document = shallowRef<AnimationDocument>(createEmptyDocument(newId()));
  const history = shallowRef(createHistory());

  // Per-element editor visibility. Transient view state — not part of the
  // document, not undoable, not exported. Replaced wholesale so reads stay
  // reactive while we keep the immutable style. Cleared on every load.
  const hiddenElementIds = ref<ReadonlySet<string>>(new Set());

  // Selected keyframe ids for timeline editing. Transient editor state like
  // `hiddenElementIds` — not in the document, not undoable, cleared on load and
  // whenever the selected element changes.
  const selectedKeyframeIds = ref<ReadonlySet<string>>(new Set());

  const canUndo = computed(() => historyCanUndo(history.value));
  const canRedo = computed(() => historyCanRedo(history.value));

  function commit(label: string, recipe: (draft: Draft<AnimationDocument>) => void): void {
    const [next, redoPatches, undoPatches] = produceWithPatches(document.value, recipe);
    if (redoPatches.length === 0) return; // nothing changed — don't pollute history
    document.value = next;
    history.value = record(history.value, { label, redo: redoPatches, undo: undoPatches });
  }

  // Selection is editor state, not an undoable edit — update it directly
  // (wholesale replace, immutable) rather than recording a history entry.
  function selectElement(elementId: string | null): void {
    if (document.value.selectedElementId === elementId) return;
    document.value = { ...document.value, selectedElementId: elementId };
    // Keyframe selection belongs to the previously selected element's tracks.
    selectedKeyframeIds.value = new Set();
  }

  function isElementHidden(elementId: string): boolean {
    return hiddenElementIds.value.has(elementId);
  }

  /** Toggle an element's editor visibility (eye toggle). Not undoable. */
  function toggleElementVisibility(elementId: string): void {
    const next = new Set(hiddenElementIds.value);
    if (next.has(elementId)) next.delete(elementId);
    else next.add(elementId);
    hiddenElementIds.value = next;
  }

  /**
   * Fill in geometry measured from the rendered SVG (bbox centre →
   * transformOrigin, getTotalLength → pathLength). Derived data, so it's
   * written by direct replace — never a `commit` — to keep it out of undo
   * history. No-ops when nothing actually changed to avoid needless renders.
   */
  function captureElementMetrics(metrics: readonly ElementMetric[]): void {
    const byId = new Map(metrics.map((metric) => [metric.id, metric]));
    let changed = false;
    const elements = document.value.elements.map((element) => {
      const metric = byId.get(element.id);
      if (metric === undefined) return element;
      const sameOrigin =
        element.transformOrigin.x === metric.transformOrigin.x &&
        element.transformOrigin.y === metric.transformOrigin.y;
      if (sameOrigin && element.pathLength === metric.pathLength) return element;
      changed = true;
      return {
        ...element,
        transformOrigin: metric.transformOrigin,
        pathLength: metric.pathLength,
      };
    });
    if (!changed) return;
    document.value = { ...document.value, elements };
  }

  function setDuration(seconds: number): void {
    const clamped = Math.max(MIN_DURATION, Math.min(MAX_DURATION, seconds));
    commit('set duration', (draft) => {
      draft.duration = clamped;
    });
  }

  /** The active tracks (animatable properties) for one element. */
  function tracksForElement(elementId: string): readonly AnyTrack[] {
    return document.value.tracks.filter((track) => track.elementId === elementId);
  }

  function trackFor(elementId: string, property: AnimatableProperty): AnyTrack | undefined {
    return document.value.tracks.find(
      (track) => track.elementId === elementId && track.property === property,
    );
  }

  /**
   * Make a property active by creating an empty track (no keyframes yet).
   * No-ops when the element's shape type can't support the property (SVG-156),
   * so the UI gate can't be bypassed.
   */
  function addProperty(elementId: string, property: AnimatableProperty): void {
    const element = document.value.elements.find((candidate) => candidate.id === elementId);
    if (element !== undefined && !isPropertySupported(element.tag, property)) return;
    commit('add property', (draft) => {
      const tracks = draft.tracks as unknown as MutableTrack[];
      const exists = tracks.some((t) => t.elementId === elementId && t.property === property);
      if (exists) return;
      tracks.push({ id: newId(), elementId, property, keyframes: [] });
    });
  }

  /**
   * Drag-reorder / re-nest a layer (SVG-157). Moves the node in the SVG DOM and
   * re-derives the flat model so canvas + export follow; one undoable commit.
   * No-ops on an impossible move (missing nodes, self, own subtree, non-container).
   */
  function moveElement(dragId: string, targetId: string, position: DropPosition): void {
    const result = applyLayerMove(document.value.svgMarkup, document.value.elements, {
      dragId,
      targetId,
      position,
    });
    if (result === null) return;
    commit('reorder layers', (draft) => {
      draft.svgMarkup = result.svgMarkup;
      draft.elements = result.elements;
    });
  }

  /** Drop a property: remove its whole track (and thus all its keyframes). */
  function removeProperty(elementId: string, property: AnimatableProperty): void {
    commit('remove property', (draft) => {
      const tracks = draft.tracks as unknown as MutableTrack[];
      const index = tracks.findIndex((t) => t.elementId === elementId && t.property === property);
      if (index === -1) return;
      tracks.splice(index, 1);
    });
  }

  function setNumberValue(
    elementId: string,
    property: NumericProperty,
    time: number,
    value: number,
  ): void {
    commit('set value', (draft) => upsertKeyframe(draft, elementId, property, time, value));
  }

  function setColorValue(
    elementId: string,
    property: ColorProperty,
    time: number,
    value: string,
  ): void {
    commit('set value', (draft) => upsertKeyframe(draft, elementId, property, time, value));
  }

  /** Drop the keyframe sitting at `time` (within the snap window), if any. */
  function removeKeyframeAt(elementId: string, property: AnimatableProperty, time: number): void {
    const track = document.value.tracks.find(
      (t) => t.elementId === elementId && t.property === property,
    );
    if (track === undefined) return;
    const hasKey = track.keyframes.some((k) => Math.abs(k.time - time) < KEYFRAME_SNAP_SECONDS);
    if (!hasKey) return;
    commit('remove keyframe', (draft) => {
      const tracks = draft.tracks as unknown as MutableTrack[];
      const target = tracks.find((t) => t.elementId === elementId && t.property === property);
      if (target === undefined) return;
      target.keyframes = target.keyframes.filter(
        (k) => Math.abs(k.time - time) >= KEYFRAME_SNAP_SECONDS,
      );
    });
  }

  function isKeyframeSelected(keyframeId: string): boolean {
    return selectedKeyframeIds.value.has(keyframeId);
  }

  /** Select one keyframe; `additive` toggles it within the current selection. */
  function selectKeyframe(keyframeId: string, additive = false): void {
    if (!additive) {
      selectedKeyframeIds.value = new Set([keyframeId]);
      return;
    }
    const next = new Set(selectedKeyframeIds.value);
    if (next.has(keyframeId)) next.delete(keyframeId);
    else next.add(keyframeId);
    selectedKeyframeIds.value = next;
  }

  /** Replace (or extend, when additive) the selection with several keyframes. */
  function selectKeyframes(keyframeIds: readonly string[], additive = false): void {
    const next = additive ? new Set(selectedKeyframeIds.value) : new Set<string>();
    for (const id of keyframeIds) next.add(id);
    selectedKeyframeIds.value = next;
  }

  function clearKeyframeSelection(): void {
    if (selectedKeyframeIds.value.size === 0) return;
    selectedKeyframeIds.value = new Set();
  }

  /**
   * Retime every selected keyframe by `deltaSeconds`, snapping each result to
   * the keyframe grid and clamping to [0, duration]. Re-sorts touched tracks to
   * preserve the sorted-by-time invariant. One undoable commit (drag-end).
   */
  function moveSelectedKeyframes(deltaSeconds: number, duration: number): void {
    const ids = selectedKeyframeIds.value;
    if (ids.size === 0) return;
    commit('move keyframes', (draft) => {
      const tracks = draft.tracks as unknown as MutableTrack[];
      for (const track of tracks) {
        let touched = false;
        for (const keyframe of track.keyframes) {
          if (!ids.has(keyframe.id)) continue;
          keyframe.time = clampTime(snapTime(keyframe.time + deltaSeconds), duration);
          touched = true;
        }
        if (touched) track.keyframes.sort((a, b) => a.time - b.time);
      }
    });
  }

  /** Delete selected keyframes, keeping now-empty tracks (the property stays active). */
  function deleteSelectedKeyframes(): void {
    const ids = selectedKeyframeIds.value;
    if (ids.size === 0) return;
    commit('delete keyframes', (draft) => {
      const tracks = draft.tracks as unknown as MutableTrack[];
      for (const track of tracks) {
        const kept = track.keyframes.filter((keyframe) => !ids.has(keyframe.id));
        if (kept.length !== track.keyframes.length) track.keyframes = kept;
      }
    });
    clearKeyframeSelection();
  }

  /** Set the (outgoing-segment) easing on every selected keyframe — one undoable commit. */
  function setEasingForSelection(easing: CubicBezierEasing): void {
    const ids = selectedKeyframeIds.value;
    if (ids.size === 0) return;
    commit('set easing', (draft) => {
      const tracks = draft.tracks as unknown as MutableTrack[];
      for (const track of tracks) {
        for (const keyframe of track.keyframes) {
          // Copy so selected keyframes never share one easing array reference.
          if (ids.has(keyframe.id)) keyframe.easing = [easing[0], easing[1], easing[2], easing[3]];
        }
      }
    });
  }

  function undo(): void {
    const result = applyUndo(history.value, document.value);
    history.value = result.history;
    document.value = result.state;
  }

  function redo(): void {
    const result = applyRedo(history.value, document.value);
    history.value = result.history;
    document.value = result.state;
  }

  /** Replace the document (import / autosave load) and reset history + view state. */
  function loadDocument(next: AnimationDocument): void {
    document.value = next;
    history.value = createHistory();
    hiddenElementIds.value = new Set();
    selectedKeyframeIds.value = new Set();
  }

  /** Parse SVG markup and load it as a fresh document, selecting the first layer. */
  function importSvg(svgText: string, fileName: string): void {
    const processed = processSvg(svgText);
    loadDocument({
      ...createEmptyDocument(newId(), fileName),
      svgMarkup: processed.svgMarkup,
      viewBox: processed.viewBox,
      elements: processed.elements,
      selectedElementId: processed.elements[0]?.id ?? null,
    });
  }

  /**
   * Load the bundled sample SVG with its example animation seeded (SVG-155), and
   * select an animated element so the timeline shows keyframes immediately. Used
   * by the initial fallback and the "Load the sample animation" button; user
   * imports go through importSvg and never carry the example tracks.
   */
  function loadSample(): void {
    const processed = processSvg(SAMPLE_SVG);
    const seeded = processed.elements.find((element) => element.id === SAMPLE_SELECTED_ELEMENT_ID);
    loadDocument({
      ...createEmptyDocument(newId(), SAMPLE_FILE_NAME),
      svgMarkup: processed.svgMarkup,
      viewBox: processed.viewBox,
      elements: processed.elements,
      tracks: buildSampleTracks(),
      duration: SAMPLE_DURATION,
      selectedElementId: seeded?.id ?? processed.elements[0]?.id ?? null,
    });
  }

  return {
    document,
    history,
    hiddenElementIds,
    selectedKeyframeIds,
    canUndo,
    canRedo,
    selectElement,
    isElementHidden,
    toggleElementVisibility,
    captureElementMetrics,
    setDuration,
    tracksForElement,
    trackFor,
    addProperty,
    removeProperty,
    moveElement,
    setNumberValue,
    setColorValue,
    removeKeyframeAt,
    isKeyframeSelected,
    selectKeyframe,
    selectKeyframes,
    clearKeyframeSelection,
    moveSelectedKeyframes,
    deleteSelectedKeyframes,
    setEasingForSelection,
    undo,
    redo,
    loadDocument,
    importSvg,
    loadSample,
  };
});
