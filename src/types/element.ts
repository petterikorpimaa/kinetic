/**
 * An imported SVG element exposed for editing. The model never holds a live
 * DOM node — `domRef` is the `data-anim-id` used to find the element inside
 * the inlined SVG, keeping the document fully serializable for autosave.
 */
export interface SceneElement {
  /** Stable id assigned on import. */
  readonly id: string;
  /** `data-anim-id` attribute value used to locate the node in the SVG. */
  readonly domRef: string;
  /** SVG tag name (circle, rect, path, g, …). */
  readonly tag: string;
  /** Human-friendly, editable name (tag + index by default). */
  readonly label: string;
  /** Bounding-box centre, used as the rotate/scale pivot. */
  readonly transformOrigin: { readonly x: number; readonly y: number };
  /** The element's ORIGINAL transform at import; animation layers on top. */
  readonly baseTransform: string;
  /** Total path length (`getTotalLength`) for stroke-draw; 0 when N/A. */
  readonly pathLength: number;
}
