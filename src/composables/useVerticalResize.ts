import { ref, onScopeDispose, type Ref } from 'vue';

/** Smallest usable timeline height; below this the lanes aren't readable. */
export const MIN_PANEL_HEIGHT = 120;
/** Cap the panel at this fraction of the viewport so the canvas never vanishes. */
const MAX_VIEWPORT_FRACTION = 0.6;

export function maxPanelHeight(viewportHeight: number): number {
  return Math.round(viewportHeight * MAX_VIEWPORT_FRACTION);
}

/** Clamp a panel height (px) to [MIN_PANEL_HEIGHT, 60% of viewport]. Pure. */
export function clampPanelHeight(value: number, viewportHeight: number): number {
  return Math.max(MIN_PANEL_HEIGHT, Math.min(maxPanelHeight(viewportHeight), value));
}

interface VerticalResize {
  readonly height: Ref<number>;
  readonly dragging: Ref<boolean>;
  readonly onHandlePointerDown: (event: PointerEvent) => void;
}

/**
 * Drag-to-resize for a panel pinned to the bottom of the viewport: dragging the
 * top edge UP grows it. Height is transient view state (two-tier rule) — a plain
 * ref, never the document. Suppresses text selection during the drag.
 */
export function useVerticalResize(initialHeight: number): VerticalResize {
  const height = ref(initialHeight);
  const dragging = ref(false);
  let startY = 0;
  let startHeight = 0;

  function onMove(event: PointerEvent): void {
    // Panel is at the bottom, so an upward drag (smaller clientY) increases height.
    height.value = clampPanelHeight(startHeight + (startY - event.clientY), window.innerHeight);
  }

  function stop(): void {
    if (!dragging.value) return;
    dragging.value = false;
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', stop);
  }

  function onHandlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging.value = true;
    startY = event.clientY;
    startHeight = height.value;
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
  }

  onScopeDispose(stop);

  return { height, dragging, onHandlePointerDown };
}
