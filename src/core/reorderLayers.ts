import type { SceneElement } from '../types/element';

/**
 * Drag-reorder / re-nest of layers (SVG-157), pure and framework-free.
 *
 * A move is applied to the actual SVG DOM (so canvas paint order, clipping and
 * export all reflect it), then the flat `parentId`-linked model is re-derived
 * from the new tree. The DOM is the source of structure; the model mirrors it.
 */

export type DropPosition = 'before' | 'after' | 'inside';

export interface LayerMove {
  readonly dragId: string;
  readonly targetId: string;
  readonly position: DropPosition;
}

export interface ReorderResult {
  readonly svgMarkup: string;
  readonly elements: SceneElement[];
}

/** Which layer types can contain children. Only groups in v1. */
export function canContainChildren(tag: string): boolean {
  return tag === 'g';
}

/**
 * Where a drop lands given the pointer's position within a row. A container row
 * has a middle "inside" band (nest as child); top/bottom quarters reorder around
 * it. A non-container row only ever reorders (before/after at the midpoint).
 */
export function dropPositionForRow(
  top: number,
  height: number,
  pointerY: number,
  isContainer: boolean,
): DropPosition {
  const rel = height > 0 ? (pointerY - top) / height : 0;
  if (isContainer) {
    if (rel < 0.25) return 'before';
    if (rel > 0.75) return 'after';
    return 'inside';
  }
  return rel < 0.5 ? 'before' : 'after';
}

/** Re-derive the flat element list (order + parentId) from the DOM, preserving metadata. */
function rederiveElements(svg: Element, oldElements: readonly SceneElement[]): SceneElement[] {
  const oldById = new Map(oldElements.map((element) => [element.id, element]));
  const result: SceneElement[] = [];
  svg.querySelectorAll('[data-anim-id]').forEach((node) => {
    const id = node.getAttribute('data-anim-id');
    if (id === null) return;
    const old = oldById.get(id);
    if (old === undefined) return; // node not tracked in the model — leave untouched
    const parentNode = node.parentElement?.closest('[data-anim-id]') ?? null;
    const parentId = parentNode?.getAttribute('data-anim-id') ?? undefined;
    // Rebuild without the old parentId, then set the new one only when nested,
    // so top-level elements carry no parentId key (absent === root).
    result.push({
      id: old.id,
      domRef: old.domRef,
      tag: old.tag,
      label: old.label,
      transformOrigin: old.transformOrigin,
      baseTransform: old.baseTransform,
      pathLength: old.pathLength,
      ...(parentId !== undefined ? { parentId } : {}),
    });
  });
  return result;
}

/**
 * Move `dragId` relative to `targetId` and return the new markup + model, or null
 * when the move is impossible (missing nodes, dropping onto itself, into its own
 * subtree, or "inside" a layer that can't contain children).
 */
export function applyLayerMove(
  svgMarkup: string,
  elements: readonly SceneElement[],
  move: LayerMove,
): ReorderResult | null {
  if (move.dragId === move.targetId) return null;

  const parsed = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  if (parsed.querySelector('parsererror') !== null) return null;
  const svg = parsed.querySelector('svg');
  if (svg === null) return null;

  // data-anim-id values are constrained to a safe charset (DEC-9), so they're
  // sound to interpolate directly into a selector.
  const dragNode = svg.querySelector(`[data-anim-id="${move.dragId}"]`);
  const targetNode = svg.querySelector(`[data-anim-id="${move.targetId}"]`);
  if (dragNode === null || targetNode === null) return null;
  // Can't drop a node onto itself or into its own subtree (would detach it).
  if (dragNode === targetNode || dragNode.contains(targetNode)) return null;

  if (move.position === 'inside') {
    if (!canContainChildren(targetNode.tagName.toLowerCase())) return null;
    targetNode.appendChild(dragNode);
  } else {
    const parent = targetNode.parentNode;
    if (parent === null) return null;
    const reference = move.position === 'before' ? targetNode : targetNode.nextSibling;
    parent.insertBefore(dragNode, reference);
  }

  return { svgMarkup: svg.outerHTML, elements: rederiveElements(svg, elements) };
}
