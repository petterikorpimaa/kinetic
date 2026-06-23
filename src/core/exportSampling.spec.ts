import { describe, it, expect } from 'vitest';
import type { NumericTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';
import {
  unionKeyframeTimes,
  tracksAreAligned,
  mergedChannelStops,
  frameTimes,
} from './exportSampling';

const EASE_A: CubicBezierEasing = [0.42, 0, 0.58, 1];
const EASE_B: CubicBezierEasing = [0, 0, 1, 1];

function track(property: NumericTrack['property'], times: number[], easing = EASE_A): NumericTrack {
  return {
    id: `${property}-track`,
    elementId: 'el',
    property,
    keyframes: times.map((time, i) => ({ id: `${property}-${i}`, time, value: i, easing })),
  };
}

describe('unionKeyframeTimes', () => {
  it('returns the sorted union of all keyframe times', () => {
    const tracks = [track('x', [0, 1, 2]), track('y', [0.5, 1])];
    expect(unionKeyframeTimes(tracks)).toEqual([0, 0.5, 1, 2]);
  });

  it('dedupes times that are within epsilon of each other', () => {
    const tracks = [track('x', [0, 1]), track('y', [0, 1.0000001])];
    expect(unionKeyframeTimes(tracks)).toEqual([0, 1]);
  });

  it('ignores empty tracks', () => {
    const tracks = [track('x', []), track('y', [0, 2])];
    expect(unionKeyframeTimes(tracks)).toEqual([0, 2]);
  });
});

describe('tracksAreAligned', () => {
  it('is aligned when only one track is animated (others constant or absent)', () => {
    const tracks = [track('x', [0, 1, 2]), track('scale', [0])];
    expect(tracksAreAligned(tracks)).toBe(true);
  });

  it('is aligned when animated tracks share times and eases', () => {
    const tracks = [track('x', [0, 1], EASE_A), track('y', [0, 1], EASE_A)];
    expect(tracksAreAligned(tracks)).toBe(true);
  });

  it('is not aligned when animated tracks differ in times', () => {
    const tracks = [track('x', [0, 1]), track('y', [0, 2])];
    expect(tracksAreAligned(tracks)).toBe(false);
  });

  it('is not aligned when animated tracks share times but differ in easing', () => {
    const tracks = [track('x', [0, 1], EASE_A), track('y', [0, 1], EASE_B)];
    expect(tracksAreAligned(tracks)).toBe(false);
  });

  it('ignores easing on the final keyframe (it has no outgoing segment)', () => {
    const tracks = [
      { ...track('x', [0, 1], EASE_A), keyframes: track('x', [0, 1], EASE_A).keyframes },
      {
        ...track('y', [0, 1]),
        keyframes: [
          { id: 'y-0', time: 0, value: 0, easing: EASE_A },
          { id: 'y-1', time: 1, value: 1, easing: EASE_B },
        ],
      },
    ];
    expect(tracksAreAligned(tracks)).toBe(true);
  });

  it('is aligned for an empty channel', () => {
    expect(tracksAreAligned([])).toBe(true);
  });
});

describe('mergedChannelStops', () => {
  it('merges disjoint members into clean per-segment stops (rotate, then scale)', () => {
    // rotation animates over [0, 0.5]; scale over [1, 1.5]; duration 2.
    const plan = mergedChannelStops(
      [track('rotation', [0, 0.5], EASE_A), track('scale', [1, 1.5], EASE_B)],
      2,
    );
    expect(plan).not.toBeNull();
    expect(plan!.map((s) => s.time)).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(plan![0]!.easing).toEqual(EASE_A); // rotation segment
    expect(plan![1]!.easing).toBeUndefined(); // 0.5→1 holds (constant)
    expect(plan![2]!.easing).toEqual(EASE_B); // scale segment
    expect(plan![3]!.easing).toBeUndefined(); // 1.5→2 holds
    expect(plan![4]!.easing).toBeUndefined(); // last stop
  });

  it('bakes (null) when one member keyframe splits another member eased segment', () => {
    // y's keyframe at 1 falls inside x's changing [0, 2] segment.
    expect(mergedChannelStops([track('x', [0, 2]), track('y', [0, 1])], 2)).toBeNull();
  });

  it('bakes (null) when two members ease differently in the same segment', () => {
    expect(
      mergedChannelStops([track('x', [0, 1], EASE_A), track('y', [0, 1], EASE_B)], 1),
    ).toBeNull();
  });

  it('stays clean for a single animated member plus a constant single-keyframe one', () => {
    const plan = mergedChannelStops([track('x', [0, 1], EASE_A), track('scale', [0.5])], 1);
    expect(plan).not.toBeNull();
    expect(plan!.map((s) => s.time)).toEqual([0, 1]); // the constant track adds no stops
    expect(plan![0]!.easing).toEqual(EASE_A);
  });

  it('shares the easing when aligned members ease the same', () => {
    const plan = mergedChannelStops([track('x', [0, 1], EASE_A), track('y', [0, 1], EASE_A)], 1);
    expect(plan!.map((s) => s.time)).toEqual([0, 1]);
    expect(plan![0]!.easing).toEqual(EASE_A);
  });
});

describe('frameTimes', () => {
  it('emits one stop per frame from 0 to duration inclusive', () => {
    expect(frameTimes(1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('ends exactly on duration even when fps does not divide evenly', () => {
    const times = frameTimes(1, 3);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBe(1);
  });
});
