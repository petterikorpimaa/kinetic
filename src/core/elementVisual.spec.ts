import { describe, it, expect } from 'vitest';
import type { SceneElement } from '../types/element';
import type { NumericTrack, ColorTrack, AnyTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';
import { computeElementVisual, applyElementVisual, type NodeBaseline } from './elementVisual';

const LINEAR: CubicBezierEasing = [0, 0, 1, 1];

function element(overrides: Partial<SceneElement> = {}): SceneElement {
  return {
    id: 'e1',
    domRef: 'e1',
    tag: 'rect',
    label: 'Rect 1',
    transformOrigin: { x: 10, y: 20 },
    baseTransform: '',
    pathLength: 0,
    ...overrides,
  };
}

const EMPTY_BASE: NodeBaseline = {
  transform: null,
  opacity: null,
  fill: null,
  stroke: null,
  strokeWidth: null,
  filter: '',
};

function colourTrack(property: ColorTrack['property'], from: string, to: string): ColorTrack {
  return {
    id: `t-${property}`,
    elementId: 'e1',
    property,
    keyframes: [
      { id: 'a', time: 0, value: from, easing: LINEAR },
      { id: 'b', time: 2, value: to, easing: LINEAR },
    ],
  };
}

function numberTrack(property: NumericTrack['property'], from: number, to: number): NumericTrack {
  return {
    id: `t-${property}`,
    elementId: 'e1',
    property,
    keyframes: [
      { id: 'a', time: 0, value: from, easing: LINEAR },
      { id: 'b', time: 2, value: to, easing: LINEAR },
    ],
  };
}

describe('computeElementVisual — transform', () => {
  it('composes a transform when any transform track is present', () => {
    const tracks: AnyTrack[] = [numberTrack('x', 0, 100)];
    const visual = computeElementVisual(element(), tracks, 1, EMPTY_BASE);
    // x interpolates to 50 at t=1; rotate/scale pivot about the origin (10,20).
    expect(visual.transform).toBe(
      'translate(50 0) rotate(0 10 20) translate(10 20) scale(1) translate(-10 -20)',
    );
  });

  it('falls back to the baseline transform when no transform track exists', () => {
    const base: NodeBaseline = { ...EMPTY_BASE, transform: 'translate(5 5)' };
    const visual = computeElementVisual(element(), [], 1, base);
    expect(visual.transform).toBe('translate(5 5)');
  });

  it('combines per-axis scale (with uniform scale) and skew about the origin', () => {
    const tracks: AnyTrack[] = [numberTrack('scaleX', 2, 2), numberTrack('skewX', 0, 30)];
    const visual = computeElementVisual(element(), tracks, 1, EMPTY_BASE);
    // scaleX=2, scaleY default 1 → scale(2 1); skewX interpolates to 15 at t=1.
    expect(visual.transform).toBe(
      'translate(0 0) rotate(0 10 20) translate(10 20) scale(2 1) skewX(15) translate(-10 -20)',
    );
  });
});

describe('computeElementVisual — opacity & fill', () => {
  it('samples opacity from its track', () => {
    const visual = computeElementVisual(element(), [numberTrack('opacity', 0, 1)], 1, EMPTY_BASE);
    expect(visual.opacity).toBe('0.5');
  });

  it('uses the baseline opacity when no opacity track exists', () => {
    const base: NodeBaseline = { ...EMPTY_BASE, opacity: '0.3' };
    const visual = computeElementVisual(element(), [], 1, base);
    expect(visual.opacity).toBe('0.3');
  });

  it('samples fill from its colour track', () => {
    const fill: ColorTrack = {
      id: 't-fill',
      elementId: 'e1',
      property: 'fill',
      keyframes: [
        { id: 'a', time: 0, value: '#000000', easing: LINEAR },
        { id: 'b', time: 2, value: '#ffffff', easing: LINEAR },
      ],
    };
    const visual = computeElementVisual(element(), [fill], 1, EMPTY_BASE);
    expect(visual.fill).toBe('#808080');
  });
});

describe('computeElementVisual — stroke', () => {
  it('samples stroke colour and width from their tracks', () => {
    const tracks: AnyTrack[] = [
      colourTrack('stroke', '#000000', '#ffffff'),
      numberTrack('strokeWidth', 1, 5),
    ];
    const visual = computeElementVisual(element(), tracks, 1, EMPTY_BASE);
    expect(visual.stroke).toBe('#808080');
    expect(visual.strokeWidth).toBe('3');
  });

  it('uses the baseline stroke and width when no track exists', () => {
    const base: NodeBaseline = { ...EMPTY_BASE, stroke: '#abcdef', strokeWidth: '7' };
    const visual = computeElementVisual(element(), [], 1, base);
    expect(visual.stroke).toBe('#abcdef');
    expect(visual.strokeWidth).toBe('7');
  });
});

describe('computeElementVisual — draw', () => {
  it('writes dasharray/offset from the path length and draw percent', () => {
    const visual = computeElementVisual(
      element({ pathLength: 100 }),
      [numberTrack('draw', 0, 100)],
      1,
      EMPTY_BASE,
    );
    expect(visual.strokeDasharray).toBe('100');
    // 50% drawn over a 100-unit path => offset 50.
    expect(visual.strokeDashoffset).toBe('50');
  });

  it('clears dash styles when there is no draw track', () => {
    const visual = computeElementVisual(element(), [], 1, EMPTY_BASE);
    expect(visual.strokeDasharray).toBe('');
    expect(visual.strokeDashoffset).toBe('');
  });
});

describe('computeElementVisual — filters', () => {
  it('composes scalar filters and drop-shadow in canonical order', () => {
    const tracks: AnyTrack[] = [numberTrack('blur', 0, 4), numberTrack('shadowX', 0, 6)];
    const visual = computeElementVisual(element(), tracks, 2, EMPTY_BASE);
    // shadowY and shadowBlur have no track, so they use their property defaults (4).
    expect(visual.filter).toBe('blur(4px) drop-shadow(6px 4px 4px #000000)');
  });

  it('uses the baseline filter when no filter track exists', () => {
    const base: NodeBaseline = { ...EMPTY_BASE, filter: 'blur(2px)' };
    const visual = computeElementVisual(element(), [], 1, base);
    expect(visual.filter).toBe('blur(2px)');
  });
});

describe('applyElementVisual', () => {
  it('writes attributes and dash styles to a node', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    applyElementVisual(node, {
      transform: 'translate(1 2)',
      opacity: '0.5',
      fill: '#abcdef',
      stroke: '#123456',
      strokeWidth: '3',
      strokeDasharray: '100',
      strokeDashoffset: '25',
      filter: 'blur(1px)',
    });
    expect(node.getAttribute('transform')).toBe('translate(1 2)');
    expect(node.getAttribute('opacity')).toBe('0.5');
    expect(node.getAttribute('fill')).toBe('#abcdef');
    expect(node.getAttribute('stroke')).toBe('#123456');
    expect(node.getAttribute('stroke-width')).toBe('3');
    expect(node.style.strokeDasharray).toBe('100');
    expect(node.style.strokeDashoffset).toBe('25');
    expect(node.style.filter).toBe('blur(1px)');
  });

  it('removes attributes when the value is null', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    node.setAttribute('transform', 'translate(9 9)');
    node.setAttribute('opacity', '0.2');
    node.setAttribute('stroke', '#000000');
    applyElementVisual(node, {
      transform: null,
      opacity: null,
      fill: null,
      stroke: null,
      strokeWidth: null,
      strokeDasharray: '',
      strokeDashoffset: '',
      filter: '',
    });
    expect(node.hasAttribute('transform')).toBe(false);
    expect(node.hasAttribute('opacity')).toBe(false);
    expect(node.hasAttribute('stroke')).toBe(false);
  });
});
