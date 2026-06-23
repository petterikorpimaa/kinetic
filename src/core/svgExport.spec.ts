import { describe, it, expect } from 'vitest';
import type { AnimationDocument } from '../types/document';
import type { SceneElement } from '../types/element';
import type { NumericTrack } from '../types/track';
import { exportAnimatedSvg } from './svgExport';

function element(overrides: Partial<SceneElement> = {}): SceneElement {
  return {
    id: 'el',
    domRef: 'orb',
    tag: 'circle',
    label: 'Orb',
    transformOrigin: { x: 0, y: 0 },
    baseTransform: '',
    pathLength: 0,
    ...overrides,
  };
}

function opacityTrack(elementId: string): NumericTrack {
  return {
    id: `${elementId}-op`,
    elementId,
    property: 'opacity',
    keyframes: [
      { id: 'a', time: 0, value: 0, easing: [0, 0, 1, 1] },
      { id: 'b', time: 1, value: 1, easing: [0, 0, 1, 1] },
    ],
  };
}

function doc(over: Partial<AnimationDocument>): AnimationDocument {
  return {
    id: 'doc',
    name: 'Test',
    duration: 1,
    fps: 60,
    viewBox: { x: 0, y: 0, w: 100, h: 100 },
    svgMarkup: '',
    elements: [element()],
    tracks: [],
    selectedElementId: null,
    ...over,
  };
}

describe('exportAnimatedSvg', () => {
  it('embeds the animation CSS in a <style> inside the svg', () => {
    const out = exportAnimatedSvg(
      doc({
        svgMarkup: '<svg viewBox="0 0 10 10"><circle data-anim-id="orb"/></svg>',
        tracks: [opacityTrack('el')],
      }),
    );
    expect(out).toContain('<style>');
    expect(out).toContain('@keyframes orb-opacity');
    expect(out).toContain('<circle data-anim-id="orb"'); // markup intact
    // <style> sits inside the svg, before the closing tag.
    expect(out.indexOf('<style>')).toBeGreaterThan(out.indexOf('<svg'));
    expect(out.indexOf('<style>')).toBeLessThan(out.indexOf('</svg>'));
  });

  it('targets nested element ids and preserves defs/clip-path (SVG-138)', () => {
    const group = element({ id: 'grp', domRef: 'grp', tag: 'g', label: 'Group 1' });
    const child = element({
      id: 'p1',
      domRef: 'p1',
      tag: 'path',
      label: 'Path 2',
      parentId: 'grp',
    });
    const out = exportAnimatedSvg(
      doc({
        svgMarkup:
          '<svg viewBox="0 0 10 10"><defs><clipPath id="c"><rect/></clipPath></defs>' +
          '<g data-anim-id="grp" clip-path="url(#c)"><path data-anim-id="p1"/></g></svg>',
        elements: [group, child],
        tracks: [opacityTrack('p1')],
      }),
    );
    expect(out).toContain('[data-anim-id="p1"]'); // CSS keys on the nested id
    expect(out.toLowerCase()).toContain('clippath'); // defs/clip-path carried through
    expect(out).toContain('clip-path="url(#c)"');
  });

  it('returns the plain markup when nothing is animated', () => {
    const markup = '<svg viewBox="0 0 10 10"><circle data-anim-id="orb"/></svg>';
    expect(exportAnimatedSvg(doc({ svgMarkup: markup, tracks: [] }))).toBe(markup);
  });

  it('returns the markup unchanged when there is none', () => {
    expect(exportAnimatedSvg(doc({ svgMarkup: '' }))).toBe('');
  });
});
