import type { SceneElement } from './element';
import type { AnyTrack } from './track';

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * The whole editable document. Plain, JSON-serializable data only — no DOM
 * refs, class instances, or functions — so it can be snapshotted for
 * undo/redo (Immer patches) and persisted for autosave without reshaping.
 *
 * Transient, pointer-frequency state (scrub playhead, live drag deltas) is
 * deliberately NOT part of this model; it lives outside deep reactivity.
 */
export interface AnimationDocument {
  readonly id: string;
  readonly name: string;
  /** Total timeline length, in seconds. */
  readonly duration: number;
  /** Frames per second, used for export sampling. */
  readonly fps: number;
  readonly viewBox: ViewBox;
  /** The inlined SVG source. Part of the document so it persists with it. */
  readonly svgMarkup: string;
  readonly elements: readonly SceneElement[];
  readonly tracks: readonly AnyTrack[];
  readonly selectedElementId: string | null;
}

const DEFAULT_DURATION_SECONDS = 3;
const DEFAULT_FPS = 60;
const DEFAULT_VIEWBOX: ViewBox = { x: 0, y: 0, w: 100, h: 100 };

/** A blank document. `id` is injected so the factory stays pure/testable. */
export function createEmptyDocument(id: string, name = 'Untitled'): AnimationDocument {
  return {
    id,
    name,
    duration: DEFAULT_DURATION_SECONDS,
    fps: DEFAULT_FPS,
    viewBox: DEFAULT_VIEWBOX,
    svgMarkup: '',
    elements: [],
    tracks: [],
    selectedElementId: null,
  };
}
