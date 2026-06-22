import { describe, it, expect } from 'vitest';
import { makeCubicBezier, cubicBezier } from './easing';
import type { CubicBezierEasing } from '../types/easing';

const LINEAR: CubicBezierEasing = [0, 0, 1, 1];
const EASE_IN: CubicBezierEasing = [0.42, 0, 1, 1];
const EASE_OUT: CubicBezierEasing = [0, 0, 0.58, 1];
const EASE_IN_OUT: CubicBezierEasing = [0.42, 0, 0.58, 1];
const OVERSHOOT: CubicBezierEasing = [0.68, -0.55, 0.27, 1.55];

describe('makeCubicBezier', () => {
  it('pins the endpoints at (0,0) and (1,1) for any curve', () => {
    for (const [x1, y1, x2, y2] of [LINEAR, EASE_IN, EASE_OUT, EASE_IN_OUT, OVERSHOOT]) {
      const ease = makeCubicBezier(x1, y1, x2, y2);
      expect(ease(0)).toBeCloseTo(0, 5);
      expect(ease(1)).toBeCloseTo(1, 5);
    }
  });

  it('is the identity for the linear curve', () => {
    const ease = makeCubicBezier(...LINEAR);
    for (const x of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(ease(x)).toBeCloseTo(x, 4);
    }
  });

  it('ease-out starts faster than linear (above the diagonal at the midpoint)', () => {
    const ease = makeCubicBezier(...EASE_OUT);
    expect(ease(0.5)).toBeGreaterThan(0.5);
  });

  it('ease-in starts slower than linear (below the diagonal at the midpoint)', () => {
    const ease = makeCubicBezier(...EASE_IN);
    expect(ease(0.5)).toBeLessThan(0.5);
  });

  it('ease-in-out is point-symmetric about (0.5, 0.5)', () => {
    const ease = makeCubicBezier(...EASE_IN_OUT);
    expect(ease(0.5)).toBeCloseTo(0.5, 4);
    expect(ease(0.3) + ease(0.7)).toBeCloseTo(1, 4);
  });

  it('allows overshoot beyond [0,1] (Back/Overshoot presets)', () => {
    const ease = makeCubicBezier(...OVERSHOOT);
    // The Overshoot curve dips below 0 early and rises above 1 late.
    let dippedBelowZero = false;
    let roseAboveOne = false;
    for (let x = 0; x <= 1.0001; x += 0.02) {
      const y = ease(x);
      if (y < 0) dippedBelowZero = true;
      if (y > 1) roseAboveOne = true;
    }
    expect(dippedBelowZero).toBe(true);
    expect(roseAboveOne).toBe(true);
  });
});

describe('cubicBezier', () => {
  it('memoises by control points (same tuple → same function reference)', () => {
    const a = cubicBezier([0.42, 0, 0.58, 1]);
    const b = cubicBezier([0.42, 0, 0.58, 1]);
    expect(a).toBe(b);
  });

  it('returns distinct functions for distinct control points', () => {
    expect(cubicBezier(EASE_IN)).not.toBe(cubicBezier(EASE_OUT));
  });

  it('matches makeCubicBezier output', () => {
    const direct = makeCubicBezier(...EASE_IN_OUT);
    const cached = cubicBezier(EASE_IN_OUT);
    for (const x of [0.1, 0.37, 0.5, 0.82]) {
      expect(cached(x)).toBeCloseTo(direct(x), 6);
    }
  });
});
