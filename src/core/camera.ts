/**
 * Canvas camera: pure zoom/pan math for the preview viewport. Framework-free
 * so it can be unit-tested in isolation; the component holds the live camera in
 * a transient ref and wires DOM events to these functions. The camera is view
 * state — it never enters the document model, history, or export.
 */
export interface Camera {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3.0;

/** Per-notch wheel factors, matching the Kinetic demo's feel. */
const ZOOM_IN_FACTOR = 1.05;
const ZOOM_OUT_FACTOR = 0.952;

export const DEFAULT_CAMERA: Camera = { zoom: 1, panX: 0, panY: 0 };

function clampZoom(zoom: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

/** Apply one wheel notch; up (negative deltaY) zooms in, down zooms out. */
export function zoomByWheel(camera: Camera, deltaY: number): Camera {
  const factor = deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
  return { ...camera, zoom: clampZoom(camera.zoom * factor) };
}

/** Offset the pan from a base camera by a pointer delta (absolute from drag start). */
export function panBy(base: Camera, dx: number, dy: number): Camera {
  return { ...base, panX: base.panX + dx, panY: base.panY + dy };
}

/** True once the user has zoomed or panned away from the default view. */
export function isViewChanged(camera: Camera): boolean {
  return camera.zoom !== 1 || camera.panX !== 0 || camera.panY !== 0;
}

/** Zoom as a whole-number percentage for the on-screen indicator. */
export function zoomPercent(camera: Camera): number {
  return Math.round(camera.zoom * 100);
}
