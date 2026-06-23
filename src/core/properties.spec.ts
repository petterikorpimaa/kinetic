import { describe, it, expect } from 'vitest';
import {
  PROPERTY_DEFS,
  PROPERTY_GROUPS,
  getPropertyDef,
  propertiesInGroup,
  formatNumber,
} from './properties';
import type { AnimatableProperty } from '../types/track';

describe('property registry', () => {
  it('exposes a definition for every registered key', () => {
    for (const def of PROPERTY_DEFS) {
      expect(getPropertyDef(def.key)).toBe(def);
    }
  });

  it('returns undefined for unknown keys', () => {
    expect(getPropertyDef('bogus' as AnimatableProperty)).toBeUndefined();
  });

  it('groups properties under their declared group', () => {
    expect(propertiesInGroup('Transform').map((def) => def.key)).toEqual([
      'x',
      'y',
      'scale',
      'scaleX',
      'scaleY',
      'rotation',
      'skewX',
      'skewY',
    ]);
    expect(propertiesInGroup('Appearance').map((def) => def.key)).toEqual([
      'opacity',
      'fill',
      'stroke',
      'strokeWidth',
      'draw',
    ]);
    expect(propertiesInGroup('Filters').map((def) => def.key)).toEqual([
      'blur',
      'brightness',
      'contrast',
      'saturate',
      'grayscale',
      'sepia',
      'invert',
      'hue',
      'shadowX',
      'shadowY',
      'shadowBlur',
      'shadowColor',
    ]);
  });

  it('covers every property across the listed groups', () => {
    const grouped = PROPERTY_GROUPS.flatMap((group) => propertiesInGroup(group));
    expect(grouped).toHaveLength(PROPERTY_DEFS.length);
  });
});

describe('formatNumber', () => {
  const scale = getPropertyDef('scale');
  const rotation = getPropertyDef('rotation');

  it('rounds to the property precision and trims trailing zeros', () => {
    if (scale?.kind !== 'number' || rotation?.kind !== 'number') throw new Error('bad fixture');
    expect(formatNumber(scale, 1.5)).toBe('1.5');
    expect(formatNumber(scale, 1.006)).toBe('1.01');
    expect(formatNumber(rotation, 44.6)).toBe('45');
  });
});
