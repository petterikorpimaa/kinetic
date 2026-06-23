import type { SceneElement } from '../types/element';

/**
 * Layer-tree derivation from the flat, `parentId`-linked element list (SVG-137).
 * Pure and framework-free — the panel renders these rows; tests target this.
 */

export interface LayerRow {
  readonly element: SceneElement;
  /** Nesting depth from the root, used for indentation. */
  readonly depth: number;
  /** Whether this element contains child layers (so it gets a disclosure toggle). */
  readonly hasChildren: boolean;
}

/**
 * Group elements by their effective parent. An element whose `parentId` doesn't
 * resolve to a known element is treated as a root, so bad data can never hide a
 * layer entirely. Document order is preserved within each parent.
 */
function childrenByParent(
  elements: readonly SceneElement[],
): Map<string | undefined, SceneElement[]> {
  const ids = new Set(elements.map((element) => element.id));
  const byParent = new Map<string | undefined, SceneElement[]>();
  for (const element of elements) {
    const key =
      element.parentId !== undefined && ids.has(element.parentId) ? element.parentId : undefined;
    const siblings = byParent.get(key);
    if (siblings) siblings.push(element);
    else byParent.set(key, [element]);
  }
  return byParent;
}

/**
 * The visible rows in display order: a pre-order walk from the roots that skips
 * the subtree under any collapsed group. Each row carries its depth and whether
 * it has children.
 */
export function layerRows(
  elements: readonly SceneElement[],
  isCollapsed: (id: string) => boolean,
): LayerRow[] {
  const byParent = childrenByParent(elements);
  const rows: LayerRow[] = [];

  function visit(parentId: string | undefined, depth: number): void {
    for (const element of byParent.get(parentId) ?? []) {
      const children = byParent.get(element.id) ?? [];
      rows.push({ element, depth, hasChildren: children.length > 0 });
      if (children.length > 0 && !isCollapsed(element.id)) visit(element.id, depth + 1);
    }
  }

  visit(undefined, 0);
  return rows;
}

/** Every id transitively nested under `id`, in document order. */
export function descendantIds(elements: readonly SceneElement[], id: string): string[] {
  const byParent = childrenByParent(elements);
  const out: string[] = [];

  function visit(parentId: string): void {
    for (const element of byParent.get(parentId) ?? []) {
      out.push(element.id);
      visit(element.id);
    }
  }

  visit(id);
  return out;
}
