import { describe, it, expect } from 'vitest';
import type { AnimationDocument } from '../types/document';
import type { SceneElement } from '../types/element';
import type { AnyTrack, NumericTrack, ColorTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';
import { exportCss } from './cssExport';

const EASE_INOUT: CubicBezierEasing = [0.42, 0, 0.58, 1];
const EASE_OUT: CubicBezierEasing = [0, 0, 0.58, 1];
const LINEAR: CubicBezierEasing = [0, 0, 1, 1];

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

function numTrack(
  property: NumericTrack['property'],
  keys: Array<[time: number, value: number, easing?: CubicBezierEasing]>,
): NumericTrack {
  return {
    id: `${property}-track`,
    elementId: 'el',
    property,
    keyframes: keys.map(([time, value, easing], i) => ({
      id: `${property}-${i}`,
      time,
      value,
      easing: easing ?? EASE_INOUT,
    })),
  };
}

function colTrack(
  property: ColorTrack['property'],
  keys: Array<[time: number, value: string, easing?: CubicBezierEasing]>,
): ColorTrack {
  return {
    id: `${property}-track`,
    elementId: 'el',
    property,
    keyframes: keys.map(([time, value, easing], i) => ({
      id: `${property}-${i}`,
      time,
      value,
      easing: easing ?? EASE_INOUT,
    })),
  };
}

function doc(tracks: AnyTrack[], overrides: Partial<AnimationDocument> = {}): AnimationDocument {
  return {
    id: 'doc',
    name: 'Test',
    duration: 1,
    fps: 60,
    viewBox: { x: 0, y: 0, w: 100, h: 100 },
    svgMarkup: '',
    elements: [element()],
    tracks,
    selectedElementId: null,
    ...overrides,
  };
}

describe('exportCss — empty', () => {
  it('returns a friendly message when there are no keyframes', () => {
    expect(exportCss(doc([]))).toBe('/* Nothing to export yet — add keyframes to an element. */');
  });

  it('returns the message when tracks exist but have no keyframes', () => {
    expect(exportCss(doc([numTrack('x', [])]))).toBe(
      '/* Nothing to export yet — add keyframes to an element. */',
    );
  });
});

describe('exportCss — single-property channels (clean)', () => {
  it('emits per-stop cubic-bezier from each keyframe outgoing easing', () => {
    const css = exportCss(
      doc([
        numTrack('opacity', [
          [0, 0, EASE_INOUT],
          [1, 1],
        ]),
      ]),
    );
    expect(css).toContain('[data-anim-id="orb"] {');
    expect(css).toContain('animation: orb-opacity 1s linear infinite;');
    expect(css).toContain('@keyframes orb-opacity {');
    expect(css).toContain(
      '0% { opacity: 0; animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1); }',
    );
    expect(css).toContain('100% { opacity: 1; }');
  });

  it('emits a static declaration (no @keyframes) for a single-keyframe track', () => {
    const css = exportCss(doc([numTrack('opacity', [[0, 0.5]])]));
    expect(css).toContain('opacity: 0.5;');
    expect(css).not.toContain('@keyframes');
    expect(css).not.toContain('animation:');
  });

  it('adds 0%/100% boundary stops when keyframes do not span the duration', () => {
    const css = exportCss(
      doc(
        [
          numTrack('opacity', [
            [0.5, 1, LINEAR],
            [0.75, 0],
          ]),
        ],
        { duration: 1 },
      ),
    );
    expect(css).toContain('0% { opacity: 1;');
    expect(css).toContain(
      '50% { opacity: 1; animation-timing-function: cubic-bezier(0, 0, 1, 1); }',
    );
    expect(css).toContain('75% { opacity: 0; }');
    expect(css).toContain('100% { opacity: 0; }');
  });
});

describe('exportCss — transform channel', () => {
  it('adds transform-box/origin and merges active sub-properties', () => {
    const css = exportCss(
      doc([
        numTrack('x', [
          [0, 0],
          [1, 40],
        ]),
      ]),
    );
    expect(css).toContain('transform-box: fill-box;');
    expect(css).toContain('transform-origin: center;');
    expect(css).toContain(
      '0% { transform: translate(0px, 0px); animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1); }',
    );
    expect(css).toContain('100% { transform: translate(40px, 0px); }');
  });

  it('emits only the active sub-properties, in canonical order', () => {
    const css = exportCss(
      doc([
        numTrack('rotation', [
          [0, 0],
          [1, 90],
        ]),
        numTrack('scale', [
          [0, 1],
          [1, 2],
        ]),
      ]),
    );
    expect(css).toContain('transform: rotate(0deg) scale(1);');
    expect(css).toContain('transform: rotate(90deg) scale(2);');
    expect(css).not.toContain('translate(');
  });

  it('keeps a constant transform static in the base rule', () => {
    const css = exportCss(doc([numTrack('scale', [[0, 1.5]])]));
    expect(css).toContain('transform: scale(1.5);');
    expect(css).not.toContain('@keyframes');
  });

  it('does not let a constant sub-track inject extra stops into a clean curve', () => {
    // x animates 0→40 over the full duration; scale is a constant set at t=0.5.
    // The clean transform curve must keep just its own 0%/100% stops — the
    // constant scale's odd time must not split the eased segment.
    const css = exportCss(
      doc([
        numTrack('x', [
          [0, 0, EASE_INOUT],
          [1, 40],
        ]),
        numTrack('scale', [[0.5, 2]]),
      ]),
    );
    // Transform is the only channel, so no 50% stop should appear anywhere.
    expect(css).not.toContain('50%');
    expect(css).toContain(
      '0% { transform: translate(0px, 0px) scale(2); animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1); }',
    );
    expect(css).toContain('100% { transform: translate(40px, 0px) scale(2); }');
  });

  it('bakes per frame when sub-tracks are not aligned', () => {
    const css = exportCss(
      doc(
        [
          numTrack('x', [
            [0, 0],
            [1, 10],
          ]),
          numTrack('y', [
            [0, 0],
            [2, 20],
          ]),
        ],
        {
          duration: 2,
          fps: 2,
        },
      ),
    );
    // fps 2 over 2s → stops at 0/25/50/75/100%; the 25% stop proves baking.
    expect(css).toContain('25% { transform:');
    expect(css).toContain('75% { transform:');
    // Baked stops carry no per-stop timing function (linear between dense stops).
    const block = css.slice(css.indexOf('@keyframes orb-transform'));
    expect(block).not.toContain('animation-timing-function');
  });
});

describe('exportCss — colour, draw, filters', () => {
  it('animates fill with hex stops', () => {
    const css = exportCss(
      doc([
        colTrack('fill', [
          [0, '#000000', LINEAR],
          [1, '#ffffff'],
        ]),
      ]),
    );
    expect(css).toContain('animation: orb-fill 1s linear infinite;');
    expect(css).toContain(
      '0% { fill: #000000; animation-timing-function: cubic-bezier(0, 0, 1, 1); }',
    );
    expect(css).toContain('100% { fill: #ffffff; }');
  });

  it('animates stroke draw via stroke-dashoffset with a static dasharray', () => {
    const css = exportCss(
      doc(
        [
          numTrack('draw', [
            [0, 0, LINEAR],
            [1, 100],
          ]),
        ],
        { elements: [element({ pathLength: 200 })] },
      ),
    );
    expect(css).toContain('stroke-dasharray: 200px;');
    expect(css).toContain('0% { stroke-dashoffset: 200px;');
    expect(css).toContain('100% { stroke-dashoffset: 0px; }');
  });

  it('composes filter functions in canonical order', () => {
    const css = exportCss(
      doc([
        numTrack('blur', [
          [0, 0, LINEAR],
          [1, 4],
        ]),
      ]),
    );
    expect(css).toContain(
      '0% { filter: blur(0px); animation-timing-function: cubic-bezier(0, 0, 1, 1); }',
    );
    expect(css).toContain('100% { filter: blur(4px); }');
  });

  it('merges scalar filters and drop-shadow into one filter channel', () => {
    const css = exportCss(
      doc([
        numTrack('brightness', [
          [0, 1],
          [1, 2],
        ]),
        numTrack('shadowX', [
          [0, 0],
          [1, 6],
        ]),
        numTrack('shadowY', [
          [0, 4],
          [1, 4],
        ]),
        colTrack('shadowColor', [
          [0, '#000000'],
          [1, '#000000'],
        ]),
      ]),
    );
    expect(css).toContain('filter: brightness(1) drop-shadow(0px 4px #000000);');
    expect(css).toContain('filter: brightness(2) drop-shadow(6px 4px #000000);');
  });
});

describe('exportCss — golden output', () => {
  it('serializes a transform + opacity element exactly', () => {
    const css = exportCss(
      doc([
        numTrack('x', [
          [0, 0, EASE_INOUT],
          [1, 40],
        ]),
        numTrack('opacity', [
          [0, 1, EASE_OUT],
          [1, 0],
        ]),
      ]),
    );
    expect(css).toBe(
      `/* Generated by Kinetic — SVG Motion Studio */

[data-anim-id="orb"] {
  transform-box: fill-box;
  transform-origin: center;
  animation: orb-transform 1s linear infinite, orb-opacity 1s linear infinite;
}

@keyframes orb-transform {
  0% { transform: translate(0px, 0px); animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1); }
  100% { transform: translate(40px, 0px); }
}

@keyframes orb-opacity {
  0% { opacity: 1; animation-timing-function: cubic-bezier(0, 0, 0.58, 1); }
  100% { opacity: 0; }
}
`,
    );
  });
});
