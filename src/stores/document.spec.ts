import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDocumentStore } from './document';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';
import type { SceneElement } from '@/types/element';

function elementFixture(id: string): SceneElement {
  return {
    id,
    domRef: id,
    tag: 'circle',
    label: id,
    transformOrigin: { x: 0, y: 0 },
    baseTransform: '',
    pathLength: 0,
  };
}

function documentWithElements(ids: readonly string[]): AnimationDocument {
  return {
    ...createEmptyDocument('doc', 'Fixture'),
    elements: ids.map(elementFixture),
  };
}

describe('useDocumentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with an empty document and no history', () => {
    const store = useDocumentStore();
    expect(store.document.elements).toHaveLength(0);
    expect(store.document.tracks).toHaveLength(0);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
  });

  it('commits setDuration and supports undo/redo', () => {
    const store = useDocumentStore();
    const original = store.document.duration;

    store.setDuration(6);
    expect(store.document.duration).toBe(6);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.document.duration).toBe(original);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.document.duration).toBe(6);
  });

  it('clamps duration to the allowed range', () => {
    const store = useDocumentStore();
    store.setDuration(999);
    expect(store.document.duration).toBe(12);
    store.setDuration(0);
    expect(store.document.duration).toBe(0.5);
  });

  it('does not record history for a no-op commit', () => {
    const store = useDocumentStore();
    store.selectElement(null); // already null → no change
    expect(store.canUndo).toBe(false);
  });

  it('selects an element', () => {
    const store = useDocumentStore();
    store.selectElement('el-1');
    expect(store.document.selectedElementId).toBe('el-1');
  });

  it('loadDocument replaces the document and resets history', () => {
    const store = useDocumentStore();
    store.setDuration(8);
    expect(store.canUndo).toBe(true);

    store.loadDocument(createEmptyDocument('fresh', 'Imported'));
    expect(store.document.name).toBe('Imported');
    expect(store.canUndo).toBe(false);
  });

  it('toggles element visibility without touching history', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a', 'b']));

    expect(store.isElementHidden('a')).toBe(false);
    store.toggleElementVisibility('a');
    expect(store.isElementHidden('a')).toBe(true);
    expect(store.isElementHidden('b')).toBe(false);
    expect(store.canUndo).toBe(false);

    store.toggleElementVisibility('a');
    expect(store.isElementHidden('a')).toBe(false);
  });

  it('clears hidden elements when a new document loads', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.toggleElementVisibility('a');
    expect(store.isElementHidden('a')).toBe(true);

    store.loadDocument(documentWithElements(['a']));
    expect(store.isElementHidden('a')).toBe(false);
  });

  it('captures element metrics without recording history', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a', 'b']));

    store.captureElementMetrics([{ id: 'a', transformOrigin: { x: 12, y: 8 }, pathLength: 314 }]);

    const a = store.document.elements.find((element) => element.id === 'a');
    const b = store.document.elements.find((element) => element.id === 'b');
    expect(a?.transformOrigin).toEqual({ x: 12, y: 8 });
    expect(a?.pathLength).toBe(314);
    expect(b?.transformOrigin).toEqual({ x: 0, y: 0 });
    expect(store.canUndo).toBe(false);
  });

  it('does not replace the document when metrics are unchanged', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    const before = store.document;

    store.captureElementMetrics([{ id: 'a', transformOrigin: { x: 0, y: 0 }, pathLength: 0 }]);

    expect(store.document).toBe(before);
  });

  it('adds and removes a property as an undoable track', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));

    store.addProperty('a', 'x');
    expect(store.tracksForElement('a').map((t) => t.property)).toEqual(['x']);
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(0);

    store.addProperty('a', 'x'); // duplicate is a no-op
    expect(store.tracksForElement('a')).toHaveLength(1);

    store.removeProperty('a', 'x');
    expect(store.tracksForElement('a')).toHaveLength(0);

    store.undo();
    expect(store.trackFor('a', 'x')).toBeDefined();
  });

  it('upserts a keyframe at the playhead via setNumberValue', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));

    store.setNumberValue('a', 'x', 1, 50);
    const track = store.trackFor('a', 'x');
    expect(track?.keyframes).toHaveLength(1);
    expect(track?.keyframes[0]).toMatchObject({ time: 1, value: 50 });

    // Editing within the snap window updates in place rather than inserting.
    store.setNumberValue('a', 'x', 1.02, 60);
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(1);
    expect(store.trackFor('a', 'x')?.keyframes[0]?.value).toBe(60);

    // A distinct time inserts and keeps keyframes sorted.
    store.setNumberValue('a', 'x', 0.5, 10);
    expect(store.trackFor('a', 'x')?.keyframes.map((k) => k.time)).toEqual([0.5, 1]);
  });

  it('stores colour keyframes via setColorValue', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));

    store.setColorValue('a', 'fill', 0, '#ff0000');
    expect(store.trackFor('a', 'fill')?.keyframes[0]?.value).toBe('#ff0000');
  });

  function keyframeId(store: ReturnType<typeof useDocumentStore>, time: number): string {
    return store.trackFor('a', 'x')!.keyframes.find((k) => k.time === time)!.id;
  }

  it('selects a single keyframe, replacing any prior selection', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 0, 0);
    store.setNumberValue('a', 'x', 1, 100);
    const k0 = keyframeId(store, 0);
    const k1 = keyframeId(store, 1);

    store.selectKeyframe(k0);
    expect(store.isKeyframeSelected(k0)).toBe(true);
    store.selectKeyframe(k1);
    expect(store.isKeyframeSelected(k0)).toBe(false);
    expect(store.isKeyframeSelected(k1)).toBe(true);
  });

  it('additively toggles keyframes in the selection', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 0, 0);
    store.setNumberValue('a', 'x', 1, 100);
    const k0 = keyframeId(store, 0);
    const k1 = keyframeId(store, 1);

    store.selectKeyframe(k0);
    store.selectKeyframe(k1, true);
    expect(store.selectedKeyframeIds.size).toBe(2);
    store.selectKeyframe(k0, true); // toggle off
    expect(store.isKeyframeSelected(k0)).toBe(false);
    expect(store.isKeyframeSelected(k1)).toBe(true);
  });

  it('clears keyframe selection when the selected element changes', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a', 'b']));
    store.setNumberValue('a', 'x', 0, 0);
    store.selectKeyframe(keyframeId(store, 0));
    expect(store.selectedKeyframeIds.size).toBe(1);

    store.selectElement('b');
    expect(store.selectedKeyframeIds.size).toBe(0);
  });

  it('moves selected keyframes by a snapped, clamped delta and re-sorts', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 0, 0);
    store.setNumberValue('a', 'x', 1, 100);
    store.selectKeyframe(keyframeId(store, 1));

    store.moveSelectedKeyframes(0.53, 4); // snaps to +0.55 → time 1.55
    expect(store.trackFor('a', 'x')?.keyframes.map((k) => k.time)).toEqual([0, 1.55]);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.trackFor('a', 'x')?.keyframes.map((k) => k.time)).toEqual([0, 1]);
  });

  it('clamps a moved keyframe to the duration', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 1, 0);
    store.selectKeyframe(keyframeId(store, 1));

    store.moveSelectedKeyframes(10, 4);
    expect(store.trackFor('a', 'x')?.keyframes[0]?.time).toBe(4);
  });

  it('deletes selected keyframes, keeping the (now empty) track', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 0, 0);
    store.setNumberValue('a', 'x', 1, 100);
    store.selectKeyframe(keyframeId(store, 0));

    store.deleteSelectedKeyframes();
    expect(store.trackFor('a', 'x')?.keyframes.map((k) => k.time)).toEqual([1]);
    expect(store.selectedKeyframeIds.size).toBe(0);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(2);
  });

  it('applies easing to every selected keyframe (undoable, not shared by reference)', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 0, 0);
    store.setNumberValue('a', 'x', 1, 100);
    const k0 = keyframeId(store, 0);
    const k1 = keyframeId(store, 1);
    store.selectKeyframe(k0);
    store.selectKeyframe(k1, true);

    store.setEasingForSelection([0.34, 1.56, 0.64, 1]);
    const keys = store.trackFor('a', 'x')!.keyframes;
    expect(keys[0]!.easing).toEqual([0.34, 1.56, 0.64, 1]);
    expect(keys[1]!.easing).toEqual([0.34, 1.56, 0.64, 1]);
    expect(keys[0]!.easing).not.toBe(keys[1]!.easing);

    store.undo();
    expect(store.trackFor('a', 'x')!.keyframes[0]!.easing).not.toEqual([0.34, 1.56, 0.64, 1]);
  });

  it('treats easing with an empty selection as a no-op', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 0, 0);

    store.setEasingForSelection([0, 0, 1, 1]);
    expect(store.canUndo).toBe(true); // only the setNumberValue is on the stack
    store.undo();
    expect(store.trackFor('a', 'x')).toBeUndefined();
  });

  it('treats move/delete with an empty selection as a no-op', () => {
    const store = useDocumentStore();
    store.loadDocument(documentWithElements(['a']));
    store.setNumberValue('a', 'x', 0, 0);

    store.moveSelectedKeyframes(1, 4);
    store.deleteSelectedKeyframes();
    expect(store.trackFor('a', 'x')?.keyframes).toHaveLength(1);
    // The only history entry is the setNumberValue above; undoing it removes the
    // lazily-created track entirely, and nothing remains to undo.
    store.undo();
    expect(store.trackFor('a', 'x')).toBeUndefined();
    expect(store.canUndo).toBe(false);
  });
});
