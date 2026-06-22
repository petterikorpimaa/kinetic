import { describe, it, expect } from 'vitest';
import { EASING_PRESETS, DEFAULT_EASING, matchPreset } from './presets';

describe('easing presets', () => {
  it('exposes the seven named presets in order', () => {
    expect(EASING_PRESETS.map((p) => p.name)).toEqual([
      'Linear',
      'Ease',
      'In',
      'Out',
      'In-Out',
      'Back',
      'Overshoot',
    ]);
  });

  it('defaults new keyframes to the In-Out curve', () => {
    expect(DEFAULT_EASING).toEqual([0.42, 0, 0.58, 1]);
    expect(matchPreset(DEFAULT_EASING)?.name).toBe('In-Out');
  });

  it('matchPreset finds a preset by its exact control points', () => {
    expect(matchPreset([0, 0, 1, 1])?.name).toBe('Linear');
    expect(matchPreset([0.34, 1.56, 0.64, 1])?.name).toBe('Back');
  });

  it('matchPreset returns undefined for a custom curve', () => {
    expect(matchPreset([0.1, 0.2, 0.3, 0.4])).toBeUndefined();
  });
});
