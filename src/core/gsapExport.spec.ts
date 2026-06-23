import { describe, it, expect } from 'vitest';
import type { AnimationDocument } from '../types/document';
import type { SceneElement } from '../types/element';
import type { AnyTrack, NumericTrack, ColorTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';
import { exportGsap } from './gsapExport';

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

describe('exportGsap', () => {
  it('returns a friendly comment when there is nothing to export', () => {
    expect(exportGsap(doc([]))).toBe('// Nothing to export yet — add keyframes to an element.');
  });

  it('registers CustomEase and creates a repeating timeline', () => {
    const css = exportGsap(
      doc([
        numTrack('opacity', [
          [0, 0],
          [1, 1],
        ]),
      ]),
    );
    expect(css).toContain("import gsap from 'gsap';");
    expect(css).toContain("import { CustomEase } from 'gsap/CustomEase';");
    expect(css).toContain('gsap.registerPlugin(CustomEase);');
    expect(css).toContain('const tl = gsap.timeline({ repeat: -1 });');
  });

  it('animates transform sub-properties independently with their own eases', () => {
    const gsapCode = exportGsap(
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
        { duration: 2 },
      ),
    );
    // Different times do NOT force baking in GSAP — each is its own tween.
    expect(gsapCode).toContain("transformOrigin: '50% 50%'");
    expect(gsapCode).toContain('tl.to(\'[data-anim-id="orb"]\', { x: 10, duration: 1, ease:');
    expect(gsapCode).toContain('tl.to(\'[data-anim-id="orb"]\', { y: 20, duration: 2, ease:');
  });

  it('emits "none" for a linear ease and CustomEase for a curve', () => {
    const gsapCode = exportGsap(
      doc([
        numTrack('opacity', [
          [0, 0, LINEAR],
          [1, 1, EASE_INOUT],
        ]),
      ]),
    );
    expect(gsapCode).toContain("ease: 'none'");
    const curved = exportGsap(
      doc([
        numTrack('opacity', [
          [0, 0, EASE_OUT],
          [1, 1],
        ]),
      ]),
    );
    expect(curved).toContain("CustomEase.create('e0', 'M0,0 C0,0 0.58,1 1,1')");
  });

  it('animates fill, and draw via strokeDashoffset with an initial dasharray', () => {
    const fill = exportGsap(
      doc([
        colTrack('fill', [
          [0, '#000000'],
          [1, '#ffffff'],
        ]),
      ]),
    );
    expect(fill).toContain("fill: '#ffffff'");
    const draw = exportGsap(
      doc(
        [
          numTrack('draw', [
            [0, 0],
            [1, 100],
          ]),
        ],
        { elements: [element({ pathLength: 200 })] },
      ),
    );
    expect(draw).toContain('strokeDasharray: 200');
    expect(draw).toContain('strokeDashoffset: 0,');
  });

  it('pads the timeline to the document duration when keyframes end early', () => {
    const gsapCode = exportGsap(
      doc(
        [
          numTrack('opacity', [
            [0, 0],
            [0.5, 1],
          ]),
        ],
        { duration: 2 },
      ),
    );
    expect(gsapCode).toContain('tl.to({}, { duration: 1.5 });');
  });

  it('serializes a transform + opacity element exactly', () => {
    const gsapCode = exportGsap(
      doc([
        numTrack('x', [
          [0, 0, LINEAR],
          [1, 40],
        ]),
        numTrack('opacity', [
          [0, 1, EASE_OUT],
          [1, 0],
        ]),
      ]),
    );
    expect(gsapCode).toBe(
      `import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

const tl = gsap.timeline({ repeat: -1 });

tl.set('[data-anim-id="orb"]', { transformOrigin: '50% 50%', x: 0, opacity: 1 }, 0);
tl.to('[data-anim-id="orb"]', { x: 40, duration: 1, ease: 'none' }, 0);
tl.to('[data-anim-id="orb"]', { opacity: 0, duration: 1, ease: CustomEase.create('e0', 'M0,0 C0,0 0.58,1 1,1') }, 0);
`,
    );
  });
});

describe('exportGsap — nested elements (SVG-138)', () => {
  it('targets a nested element by its data-anim-id', () => {
    const group = element({ id: 'grp', domRef: 'grp', tag: 'g', label: 'Group 1' });
    const child = element({
      id: 'p1',
      domRef: 'p1',
      tag: 'path',
      label: 'Path 2',
      parentId: 'grp',
    });
    const track = numTrack('opacity', [
      [0, 0, LINEAR],
      [1, 1, LINEAR],
    ]);
    const code = exportGsap(doc([{ ...track, elementId: 'p1' }], { elements: [group, child] }));
    expect(code).toContain('[data-anim-id="p1"]');
  });
});
