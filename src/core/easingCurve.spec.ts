import { describe, it, expect } from 'vitest';
import {
  CURVE_Y_MIN,
  CURVE_Y_MAX,
  clampControlPoints,
  toViewBox,
  fromViewBox,
  curvePath,
  cubicBezierCss,
} from './easingCurve';
import type { CubicBezierEasing } from '../types/easing';

const EASE: CubicBezierEasing = [0.25, 0.1, 0.25, 1];

describe('clampControlPoints', () => {
  it('clamps x into [0,1] and y into [Y_MIN, Y_MAX]', () => {
    expect(clampControlPoints([-0.5, -2, 1.5, 3])).toEqual([0, CURVE_Y_MIN, 1, CURVE_Y_MAX]);
  });

  it('leaves in-range overshoot points untouched', () => {
    expect(clampControlPoints([0.34, 1.56, 0.64, 1])).toEqual([0.34, 1.56, 0.64, 1]);
  });
});

describe('toViewBox / fromViewBox', () => {
  it('maps the curve endpoints to opposite corners (y flipped)', () => {
    const size = 100;
    // y = 0 sits below y = 1 in screen space.
    expect(toViewBox(0, 0, size).x).toBe(0);
    expect(toViewBox(1, 1, size).x).toBe(100);
    expect(toViewBox(0, 0, size).y).toBeGreaterThan(toViewBox(1, 1, size).y);
  });

  it('round-trips a value through view space', () => {
    const v = toViewBox(0.3, 0.8, 100);
    const back = fromViewBox(v.x, v.y, 100);
    expect(back.x).toBeCloseTo(0.3, 6);
    expect(back.y).toBeCloseTo(0.8, 6);
  });

  it('places y = Y_MAX at the top (0) and y = Y_MIN at the bottom (size)', () => {
    expect(toViewBox(0, CURVE_Y_MAX, 100).y).toBeCloseTo(0, 6);
    expect(toViewBox(0, CURVE_Y_MIN, 100).y).toBeCloseTo(100, 6);
  });
});

describe('curvePath', () => {
  it('starts at (0,0) and ends at (1,1) in view space', () => {
    const path = curvePath(EASE, 100);
    const start = toViewBox(0, 0, 100);
    const end = toViewBox(1, 1, 100);
    expect(path.startsWith(`M ${start.x} ${start.y} C`)).toBe(true);
    expect(path.endsWith(`${end.x} ${end.y}`)).toBe(true);
  });
});

describe('cubicBezierCss', () => {
  it('formats a cubic-bezier() string rounded to 3 decimals', () => {
    expect(cubicBezierCss([0, 0, 1, 1])).toBe('cubic-bezier(0, 0, 1, 1)');
    expect(cubicBezierCss([0.2509, 0.1, 0.25, 1])).toBe('cubic-bezier(0.251, 0.1, 0.25, 1)');
  });
});
