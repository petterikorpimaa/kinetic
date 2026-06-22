import { describe, it, expect } from 'vitest';
import {
  SNAP_SECONDS,
  clampTime,
  snapTime,
  timeToFraction,
  fractionToTime,
  tickStep,
  buildTicks,
} from './timeline';

describe('clampTime', () => {
  it('clamps to [0, duration]', () => {
    expect(clampTime(-1, 5)).toBe(0);
    expect(clampTime(2.5, 5)).toBe(2.5);
    expect(clampTime(9, 5)).toBe(5);
  });

  it('returns 0 for a non-positive duration', () => {
    expect(clampTime(3, 0)).toBe(0);
    expect(clampTime(3, -2)).toBe(0);
  });
});

describe('snapTime', () => {
  it('snaps to the keyframe grid by default', () => {
    expect(snapTime(0.07)).toBeCloseTo(0.05, 6);
    expect(snapTime(0.13)).toBeCloseTo(0.15, 6);
    expect(snapTime(1.024)).toBeCloseTo(1.0, 6);
  });

  it('snaps to a custom step', () => {
    expect(snapTime(0.9, 0.5)).toBeCloseTo(1.0, 6);
    expect(snapTime(0.7, 0.5)).toBeCloseTo(0.5, 6);
  });

  it('cleans floating-point drift', () => {
    // 0.05 * 3 in floating point is 0.15000000000000002 without cleanup.
    expect(snapTime(0.15)).toBe(0.15);
  });

  it('returns the input unchanged for a non-positive step', () => {
    expect(snapTime(1.234, 0)).toBe(1.234);
  });

  it('exposes the grid constant', () => {
    expect(SNAP_SECONDS).toBe(0.05);
  });
});

describe('timeToFraction / fractionToTime', () => {
  it('maps time to a [0,1] fraction', () => {
    expect(timeToFraction(0, 4)).toBe(0);
    expect(timeToFraction(2, 4)).toBe(0.5);
    expect(timeToFraction(4, 4)).toBe(1);
  });

  it('clamps out-of-range times', () => {
    expect(timeToFraction(-1, 4)).toBe(0);
    expect(timeToFraction(8, 4)).toBe(1);
  });

  it('inverts back to seconds, clamping the fraction', () => {
    expect(fractionToTime(0.5, 4)).toBe(2);
    expect(fractionToTime(-0.2, 4)).toBe(0);
    expect(fractionToTime(1.5, 4)).toBe(4);
  });

  it('round-trips', () => {
    expect(fractionToTime(timeToFraction(1.3, 4), 4)).toBeCloseTo(1.3, 6);
  });

  it('guards a non-positive duration', () => {
    expect(timeToFraction(2, 0)).toBe(0);
    expect(fractionToTime(0.5, 0)).toBe(0);
  });
});

describe('tickStep', () => {
  it('scales the step with duration', () => {
    expect(tickStep(2)).toBe(0.5);
    expect(tickStep(3)).toBe(0.5);
    expect(tickStep(5)).toBe(1);
    expect(tickStep(6)).toBe(1);
    expect(tickStep(10)).toBe(2);
  });
});

describe('buildTicks', () => {
  it('builds inclusive ticks at the adaptive step', () => {
    const ticks = buildTicks(2);
    expect(ticks.map((t) => t.time)).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it('labels only whole seconds', () => {
    const ticks = buildTicks(2);
    expect(ticks.map((t) => t.label)).toEqual(['0s', '', '1s', '', '2s']);
  });

  it('positions ticks as fractions of the duration', () => {
    const ticks = buildTicks(4);
    expect(ticks[0]!.fraction).toBe(0);
    expect(ticks[ticks.length - 1]!.fraction).toBe(1);
  });

  it('does not overshoot the duration', () => {
    const ticks = buildTicks(5);
    expect(ticks[ticks.length - 1]!.time).toBeLessThanOrEqual(5);
  });

  it('returns no ticks for a non-positive duration', () => {
    expect(buildTicks(0)).toEqual([]);
  });
});
