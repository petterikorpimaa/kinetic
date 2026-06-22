import { describe, it, expect } from 'vitest';
import { advancePlayhead } from './playback';

describe('advancePlayhead', () => {
  it('moves forward and keeps playing within range', () => {
    expect(advancePlayhead(1, 0.5, 4, false)).toEqual({ time: 1.5, playing: true });
  });

  it('clamps a backward delta to zero', () => {
    expect(advancePlayhead(0.2, -1, 4, false)).toEqual({ time: 0, playing: true });
  });

  it('stops at the end when not looping', () => {
    expect(advancePlayhead(3.9, 0.5, 4, false)).toEqual({ time: 4, playing: false });
  });

  it('stops exactly at the end boundary when not looping', () => {
    expect(advancePlayhead(3.5, 0.5, 4, false)).toEqual({ time: 4, playing: false });
  });

  it('wraps to the start when looping past the end', () => {
    const next = advancePlayhead(3.8, 0.5, 4, true);
    expect(next.time).toBeCloseTo(0.3, 6);
    expect(next.playing).toBe(true);
  });

  it('wraps to zero when looping lands exactly on the end', () => {
    expect(advancePlayhead(3.5, 0.5, 4, true)).toEqual({ time: 0, playing: true });
  });

  it('handles a large delta (stalled frame) with modulo when looping', () => {
    expect(advancePlayhead(0, 5, 2, true)).toEqual({ time: 1, playing: true });
  });

  it('guards a non-positive duration', () => {
    expect(advancePlayhead(1, 0.5, 0, true)).toEqual({ time: 0, playing: false });
    expect(advancePlayhead(1, 0.5, -3, false)).toEqual({ time: 0, playing: false });
  });
});
