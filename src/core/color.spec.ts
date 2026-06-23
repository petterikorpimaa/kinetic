import { describe, it, expect } from 'vitest';
import { hexToRgb, mixHexColor, normalizeHex, luminance, isLightColor } from './color';

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#14b8a6')).toEqual([20, 184, 166]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
  });

  it('expands 3-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#f00')).toEqual([255, 0, 0]);
  });

  it('falls back to brand teal on invalid input', () => {
    expect(hexToRgb('not-a-color')).toEqual([20, 184, 166]);
    expect(hexToRgb('#12')).toEqual([20, 184, 166]);
    expect(hexToRgb('')).toEqual([20, 184, 166]);
  });
});

describe('mixHexColor', () => {
  it('returns the endpoints at 0 and 1', () => {
    expect(mixHexColor('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHexColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('blends to the midpoint, zero-padding channels', () => {
    expect(mixHexColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('normalizeHex', () => {
  it('accepts valid hex and lowercases it', () => {
    expect(normalizeHex('#14B8A6')).toBe('#14b8a6');
    expect(normalizeHex('#FFF')).toBe('#fff');
  });

  it('prepends a missing hash and strips junk', () => {
    expect(normalizeHex('14b8a6')).toBe('#14b8a6');
    expect(normalizeHex('  #abc  ')).toBe('#abc');
  });

  it('returns null when it cannot be made valid', () => {
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('#12')).toBeNull();
    expect(normalizeHex('xyz')).toBeNull();
  });
});

describe('luminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBe(1);
  });

  it('weights green more than red and blue', () => {
    expect(luminance('#00ff00')).toBeGreaterThan(luminance('#ff0000'));
    expect(luminance('#ff0000')).toBeGreaterThan(luminance('#0000ff'));
  });
});

describe('isLightColor', () => {
  it('treats near-white as light and the dark editor background as dark', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#eeeeee')).toBe(true);
    expect(isLightColor('#0d0d14')).toBe(false);
    expect(isLightColor('#000000')).toBe(false);
  });
});
