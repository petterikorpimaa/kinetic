import { describe, it, expect } from 'vitest';
import type { AnimationDocument } from '../types/document';
import type { AnyTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';
import { createFrameRenderer } from './frameRender';

const LINEAR: CubicBezierEasing = [0, 0, 1, 1];

const SVG =
  '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">' +
  '<rect data-anim-id="r1" id="r1" x="0" y="0" width="10" height="10" fill="#000000"></rect>' +
  '<circle data-anim-id="c1" id="c1" cx="50" cy="50" r="5"></circle>' +
  '</svg>';

function doc(tracks: AnyTrack[] = []): AnimationDocument {
  return {
    id: 'doc',
    name: 'test',
    duration: 2,
    fps: 30,
    viewBox: { x: 0, y: 0, w: 200, h: 100 },
    svgMarkup: SVG,
    elements: [
      {
        id: 'r1',
        domRef: 'r1',
        tag: 'rect',
        label: 'Rect',
        transformOrigin: { x: 5, y: 5 },
        baseTransform: '',
        pathLength: 0,
      },
      {
        id: 'c1',
        domRef: 'c1',
        tag: 'circle',
        label: 'Circle',
        transformOrigin: { x: 50, y: 50 },
        baseTransform: '',
        pathLength: 0,
      },
    ],
    tracks,
    selectedElementId: null,
  };
}

function track(property: AnyTrack['property'], from: number, to: number): AnyTrack {
  return {
    id: `t-${property}`,
    elementId: 'r1',
    property,
    keyframes: [
      { id: 'a', time: 0, value: from, easing: LINEAR },
      { id: 'b', time: 2, value: to, easing: LINEAR },
    ],
  } as AnyTrack;
}

describe('createFrameRenderer', () => {
  it('reports the viewBox dimensions', () => {
    const renderer = createFrameRenderer(doc());
    expect(renderer.width).toBe(200);
    expect(renderer.height).toBe(100);
  });

  it('bakes animated values into the frame markup', () => {
    const renderer = createFrameRenderer(doc([track('x', 0, 100), track('opacity', 0, 1)]));
    const frame = renderer.renderAt(1);
    expect(frame).toContain('opacity="0.5"');
    expect(frame).toContain(
      'transform="translate(50 0) rotate(0 5 5) translate(5 5) scale(1) translate(-5 -5)"',
    );
  });

  it('produces a different frame at a different time (deterministic, no accumulation)', () => {
    const renderer = createFrameRenderer(doc([track('x', 0, 100)]));
    const atStart = renderer.renderAt(0);
    const atEnd = renderer.renderAt(2);
    expect(atStart).toContain('translate(0 0)');
    expect(atEnd).toContain('translate(100 0)');
    // Re-rendering the start frame yields the start value again.
    expect(renderer.renderAt(0)).toContain('translate(0 0)');
  });

  it('hides elements whose id is in hiddenIds', () => {
    const renderer = createFrameRenderer(doc(), { hiddenIds: new Set(['c1']) });
    expect(renderer.renderAt(0)).toContain('display: none');
  });

  it('sets explicit width/height on the root for rasterization', () => {
    const frame = createFrameRenderer(doc()).renderAt(0);
    expect(frame).toContain('width="200"');
    expect(frame).toContain('height="100"');
  });

  it('throws when the document has no SVG root', () => {
    expect(() => createFrameRenderer({ ...doc(), svgMarkup: '' })).toThrow();
  });
});
