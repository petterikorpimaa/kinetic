import { describe, it, expect } from 'vitest';
import { valueAt } from './valueAt';
import type { CubicBezierEasing } from '../types/easing';
import type { NumericKeyframe, NumericTrack } from '../types';

const LINEAR: CubicBezierEasing = [0, 0, 1, 1];
const EASE_OUT: CubicBezierEasing = [0, 0, 0.58, 1];

function keyframe(
  time: number,
  value: number,
  easing: CubicBezierEasing = LINEAR,
): NumericKeyframe {
  return { id: `k${time}`, time, value, easing };
}

function track(keyframes: NumericKeyframe[]): NumericTrack {
  return { id: 't1', elementId: 'e1', property: 'x', keyframes };
}

describe('valueAt', () => {
  it('throws when the track has no keyframes', () => {
    expect(() => valueAt(track([]), 0)).toThrow(/no keyframes/);
  });

  it('returns the single keyframe value at any time', () => {
    const single = track([keyframe(1, 42)]);
    expect(valueAt(single, 0)).toBe(42);
    expect(valueAt(single, 1)).toBe(42);
    expect(valueAt(single, 5)).toBe(42);
  });

  it('clamps before the first and after the last keyframe', () => {
    const t = track([keyframe(1, 10), keyframe(3, 30)]);
    expect(valueAt(t, 0)).toBe(10);
    expect(valueAt(t, -2)).toBe(10);
    expect(valueAt(t, 3)).toBe(30);
    expect(valueAt(t, 99)).toBe(30);
  });

  it('returns the exact value on a keyframe time', () => {
    const t = track([keyframe(0, 0), keyframe(2, 100), keyframe(4, 50)]);
    expect(valueAt(t, 0)).toBe(0);
    expect(valueAt(t, 2)).toBe(100);
    expect(valueAt(t, 4)).toBe(50);
  });

  it('linearly interpolates between keyframes with linear easing', () => {
    const t = track([keyframe(0, 0), keyframe(2, 100)]);
    expect(valueAt(t, 1)).toBeCloseTo(50, 6);
    expect(valueAt(t, 0.5)).toBeCloseTo(25, 6);
    expect(valueAt(t, 1.5)).toBeCloseTo(75, 6);
  });

  it('eases by the LEFT keyframe (it owns its outgoing segment)', () => {
    // From-keyframe uses ease-out (fast start); to-keyframe easing is ignored.
    const eased = track([keyframe(0, 0, EASE_OUT), keyframe(2, 100, LINEAR)]);
    const linear = track([keyframe(0, 0, LINEAR), keyframe(2, 100, EASE_OUT)]);
    expect(valueAt(eased, 1)).toBeGreaterThan(50);
    expect(valueAt(linear, 1)).toBeCloseTo(50, 6);
  });

  it('handles negative and fractional values', () => {
    const t = track([keyframe(0, -10), keyframe(1, 10)]);
    expect(valueAt(t, 0.5)).toBeCloseTo(0, 6);
  });

  it('picks the correct segment across many keyframes', () => {
    const t = track([keyframe(0, 0), keyframe(1, 10), keyframe(2, 10), keyframe(3, 0)]);
    expect(valueAt(t, 0.5)).toBeCloseTo(5, 6);
    expect(valueAt(t, 1.5)).toBeCloseTo(10, 6); // flat segment
    expect(valueAt(t, 2.5)).toBeCloseTo(5, 6);
  });
});
