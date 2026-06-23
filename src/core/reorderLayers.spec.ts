import { describe, it, expect } from 'vitest';
import { applyLayerMove, canContainChildren, dropPositionForRow } from './reorderLayers';
import { processSvg } from './processSvg';
import type { SceneElement } from '../types/element';

// A grouped scene: badge(g) ─ petal(path), core(circle); plus a top-level box(rect).
const GROUPED =
  '<svg viewBox="0 0 100 100">' +
  '<g id="badge"><path id="petal"/><circle id="core"/></g>' +
  '<rect id="box"/>' +
  '</svg>';

function scene() {
  const { svgMarkup, elements } = processSvg(GROUPED);
  return { svgMarkup, elements };
}

function ids(elements: readonly SceneElement[]): string[] {
  return elements.map((element) => element.id);
}

function parentOf(elements: readonly SceneElement[], id: string): string | undefined {
  return elements.find((element) => element.id === id)?.parentId;
}

describe('canContainChildren', () => {
  it('allows only groups to contain children', () => {
    expect(canContainChildren('g')).toBe(true);
    expect(canContainChildren('path')).toBe(false);
    expect(canContainChildren('rect')).toBe(false);
  });
});

describe('dropPositionForRow', () => {
  it('splits a non-container row at the midpoint', () => {
    expect(dropPositionForRow(0, 100, 40, false)).toBe('before');
    expect(dropPositionForRow(0, 100, 60, false)).toBe('after');
  });

  it('gives a container row a middle "inside" band', () => {
    expect(dropPositionForRow(0, 100, 10, true)).toBe('before');
    expect(dropPositionForRow(0, 100, 50, true)).toBe('inside');
    expect(dropPositionForRow(0, 100, 90, true)).toBe('after');
  });
});

describe('applyLayerMove', () => {
  it('reorders a top-level layer after another (sibling reorder)', () => {
    const { svgMarkup, elements } = scene();
    const result = applyLayerMove(svgMarkup, elements, {
      dragId: 'box',
      targetId: 'badge',
      position: 'before',
    });
    expect(result).not.toBeNull();
    expect(ids(result!.elements)).toEqual(['box', 'badge', 'petal', 'core']);
    expect(parentOf(result!.elements, 'box')).toBeUndefined();
  });

  it('nests a layer inside a group (drop inside)', () => {
    const { svgMarkup, elements } = scene();
    const result = applyLayerMove(svgMarkup, elements, {
      dragId: 'box',
      targetId: 'badge',
      position: 'inside',
    });
    expect(result).not.toBeNull();
    expect(parentOf(result!.elements, 'box')).toBe('badge');
    // box becomes the last child of badge, reflected in markup + pre-order.
    expect(ids(result!.elements)).toEqual(['badge', 'petal', 'core', 'box']);
    expect(result!.svgMarkup).toMatch(/<g[^>]*data-anim-id="badge".*data-anim-id="box".*<\/g>/s);
  });

  it('pulls a nested child out to the top level', () => {
    const { svgMarkup, elements } = scene();
    const result = applyLayerMove(svgMarkup, elements, {
      dragId: 'petal',
      targetId: 'box',
      position: 'after',
    });
    expect(result).not.toBeNull();
    expect(parentOf(result!.elements, 'petal')).toBeUndefined();
    expect(ids(result!.elements)).toEqual(['badge', 'core', 'box', 'petal']);
  });

  it('refuses to drop inside a non-container layer', () => {
    const { svgMarkup, elements } = scene();
    expect(
      applyLayerMove(svgMarkup, elements, { dragId: 'box', targetId: 'core', position: 'inside' }),
    ).toBeNull();
  });

  it('refuses to drop a group into its own subtree', () => {
    const { svgMarkup, elements } = scene();
    expect(
      applyLayerMove(svgMarkup, elements, {
        dragId: 'badge',
        targetId: 'petal',
        position: 'after',
      }),
    ).toBeNull();
    expect(
      applyLayerMove(svgMarkup, elements, {
        dragId: 'badge',
        targetId: 'core',
        position: 'inside',
      }),
    ).toBeNull();
  });

  it('refuses a no-op drop onto itself', () => {
    const { svgMarkup, elements } = scene();
    expect(
      applyLayerMove(svgMarkup, elements, { dragId: 'box', targetId: 'box', position: 'before' }),
    ).toBeNull();
  });

  it('returns null for an unknown id', () => {
    const { svgMarkup, elements } = scene();
    expect(
      applyLayerMove(svgMarkup, elements, { dragId: 'ghost', targetId: 'box', position: 'before' }),
    ).toBeNull();
  });
});
