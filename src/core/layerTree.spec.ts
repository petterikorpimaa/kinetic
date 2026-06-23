import { describe, it, expect } from 'vitest';
import { layerRows, descendantIds } from './layerTree';
import type { SceneElement } from '../types/element';

function el(id: string, parentId?: string): SceneElement {
  return {
    id,
    domRef: id,
    tag: parentId === undefined ? 'g' : 'path',
    label: id,
    transformOrigin: { x: 0, y: 0 },
    baseTransform: '',
    pathLength: 0,
    ...(parentId !== undefined ? { parentId } : {}),
  };
}

// grp ─ p1
//     └ sub ─ p2
const NESTED: SceneElement[] = [
  el('grp'),
  el('p1', 'grp'),
  el('sub', 'grp'),
  el('p2', 'sub'),
  el('top', undefined),
];

const none = () => false;

describe('layerRows', () => {
  it('flattens the hierarchy in pre-order with a depth per row', () => {
    const rows = layerRows(NESTED, none);
    expect(rows.map((r) => [r.element.id, r.depth])).toEqual([
      ['grp', 0],
      ['p1', 1],
      ['sub', 1],
      ['p2', 2],
      ['top', 0],
    ]);
  });

  it('marks rows that contain children', () => {
    const rows = layerRows(NESTED, none);
    const byId = new Map(rows.map((r) => [r.element.id, r.hasChildren]));
    expect(byId.get('grp')).toBe(true);
    expect(byId.get('sub')).toBe(true);
    expect(byId.get('p1')).toBe(false);
    expect(byId.get('top')).toBe(false);
  });

  it('hides the subtree under a collapsed group but keeps the group itself', () => {
    const rows = layerRows(NESTED, (id) => id === 'grp');
    expect(rows.map((r) => r.element.id)).toEqual(['grp', 'top']);
  });

  it('treats an element with a dangling parentId as a root (defensive)', () => {
    const orphan = [el('ghostChild', 'missing')];
    const rows = layerRows(orphan, none);
    expect(rows.map((r) => [r.element.id, r.depth])).toEqual([['ghostChild', 0]]);
  });
});

describe('descendantIds', () => {
  it('collects every transitive child id', () => {
    expect(descendantIds(NESTED, 'grp').sort()).toEqual(['p1', 'p2', 'sub']);
    expect(descendantIds(NESTED, 'sub')).toEqual(['p2']);
    expect(descendantIds(NESTED, 'p1')).toEqual([]);
  });
});
