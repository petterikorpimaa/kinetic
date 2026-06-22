import { describe, it, expect } from 'vitest';
import type { NumericTrack, ColorTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';
import {
  sampleNumber,
  sampleColor,
  hasKeyframeAt,
  composeTransform,
  strokeDashOffset,
} from './animation';

const LINEAR: CubicBezierEasing = [0, 0, 1, 1];

const numericTrack: NumericTrack = {
  id: 't1',
  elementId: 'e1',
  property: 'x',
  keyframes: [
    { id: 'k0', time: 0, value: 0, easing: LINEAR },
    { id: 'k1', time: 2, value: 100, easing: LINEAR },
  ],
};

const colorTrack: ColorTrack = {
  id: 't2',
  elementId: 'e1',
  property: 'fill',
  keyframes: [
    { id: 'k0', time: 0, value: '#000000', easing: LINEAR },
    { id: 'k1', time: 2, value: '#ffffff', easing: LINEAR },
  ],
};

describe('sampleNumber', () => {
  it('interpolates between keyframes', () => {
    expect(sampleNumber(numericTrack, 1, 0)).toBe(50);
  });

  it('falls back when the track is missing or empty', () => {
    expect(sampleNumber(undefined, 1, 7)).toBe(7);
    expect(sampleNumber({ ...numericTrack, keyframes: [] }, 1, 7)).toBe(7);
  });
});

describe('sampleColor', () => {
  it('interpolates between colours', () => {
    expect(sampleColor(colorTrack, 1, '#14b8a6')).toBe('#808080');
  });

  it('falls back when the track is missing or empty', () => {
    expect(sampleColor(undefined, 1, '#14b8a6')).toBe('#14b8a6');
    expect(sampleColor({ ...colorTrack, keyframes: [] }, 1, '#abcdef')).toBe('#abcdef');
  });
});

describe('hasKeyframeAt', () => {
  it('matches within the snap tolerance', () => {
    expect(hasKeyframeAt(numericTrack.keyframes, 0.02)).toBe(true);
    expect(hasKeyframeAt(numericTrack.keyframes, 0.05)).toBe(false);
  });
});

describe('composeTransform', () => {
  it('builds a translate/rotate/scale string about the origin', () => {
    expect(composeTransform({ x: 10, y: 20 }, { x: 5, y: 5, scale: 2, rotation: 90 })).toBe(
      'translate(5 5) rotate(90 10 20) translate(10 20) scale(2) translate(-10 -20)',
    );
  });
});

describe('strokeDashOffset', () => {
  it('maps draw percent to a dash offset', () => {
    expect(strokeDashOffset(100, 100)).toBe(0);
    expect(strokeDashOffset(100, 0)).toBe(100);
    expect(strokeDashOffset(100, 50)).toBe(50);
  });
});
