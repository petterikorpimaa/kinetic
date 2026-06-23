import { describe, it, expect } from 'vitest';
import {
  isPropertySupported,
  isPropertySupportedByAll,
  supportedPropertiesForTag,
  unsupportedReason,
  friendlyTagName,
} from './shapeProperties';
import { PROPERTY_DEFS } from './properties';
import type { AnimatableProperty } from '../types/track';

const UNIVERSAL: AnimatableProperty[] = [
  'x',
  'y',
  'scale',
  'scaleX',
  'scaleY',
  'rotation',
  'skewX',
  'skewY',
  'opacity',
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
];

describe('isPropertySupported', () => {
  it('treats transform, opacity and filters as universal across every shape', () => {
    for (const tag of ['rect', 'circle', 'path', 'line', 'text', 'image', 'g', 'use']) {
      for (const property of UNIVERSAL) {
        expect(isPropertySupported(tag, property)).toBe(true);
      }
    }
  });

  it('supports fill and draw on geometry shapes', () => {
    for (const tag of ['rect', 'circle', 'ellipse', 'polygon', 'polyline', 'path']) {
      expect(isPropertySupported(tag, 'fill')).toBe(true);
      expect(isPropertySupported(tag, 'draw')).toBe(true);
    }
  });

  it('a line has stroke geometry but no fill region', () => {
    expect(isPropertySupported('line', 'draw')).toBe(true);
    expect(isPropertySupported('line', 'fill')).toBe(false);
  });

  it('text is fillable but has no draw-on path length', () => {
    expect(isPropertySupported('text', 'fill')).toBe(true);
    expect(isPropertySupported('text', 'draw')).toBe(false);
  });

  it('a group cascades fill to children but has no path length of its own', () => {
    expect(isPropertySupported('g', 'fill')).toBe(true);
    expect(isPropertySupported('g', 'draw')).toBe(false);
  });

  it('a raster image supports neither fill nor draw', () => {
    expect(isPropertySupported('image', 'fill')).toBe(false);
    expect(isPropertySupported('image', 'draw')).toBe(false);
  });

  it('stroke and stroke width apply to any stroked shape but not a raster image', () => {
    for (const tag of ['rect', 'circle', 'path', 'line', 'text']) {
      expect(isPropertySupported(tag, 'stroke')).toBe(true);
      expect(isPropertySupported(tag, 'strokeWidth')).toBe(true);
    }
    expect(isPropertySupported('image', 'stroke')).toBe(false);
    expect(isPropertySupported('image', 'strokeWidth')).toBe(false);
  });

  it('is permissive for unknown tags so valid-but-exotic shapes are never wrongly blocked', () => {
    expect(isPropertySupported('foreignObject', 'fill')).toBe(true);
    expect(isPropertySupported('foreignObject', 'draw')).toBe(true);
  });
});

describe('isPropertySupportedByAll', () => {
  it('is true only when every tag supports the property', () => {
    expect(isPropertySupportedByAll(['circle', 'path'], 'draw')).toBe(true);
    expect(isPropertySupportedByAll(['circle', 'text'], 'draw')).toBe(false); // text has no draw
    expect(isPropertySupportedByAll(['circle', 'line'], 'fill')).toBe(false); // line has no fill
    expect(isPropertySupportedByAll(['circle', 'text', 'line'], 'opacity')).toBe(true);
  });

  it('is false for an empty selection', () => {
    expect(isPropertySupportedByAll([], 'opacity')).toBe(false);
  });
});

describe('supportedPropertiesForTag', () => {
  it('returns a non-empty set drawn from the property catalogue', () => {
    const all = PROPERTY_DEFS.map((def) => def.key);
    const circle = supportedPropertiesForTag('circle');
    expect(circle).toEqual(all); // circle supports everything
  });

  it('excludes draw for text and fill for line', () => {
    expect(supportedPropertiesForTag('text')).not.toContain('draw');
    expect(supportedPropertiesForTag('text')).toContain('fill');
    expect(supportedPropertiesForTag('line')).not.toContain('fill');
    expect(supportedPropertiesForTag('line')).toContain('draw');
  });
});

describe('unsupportedReason', () => {
  it('is null when the property is supported', () => {
    expect(unsupportedReason(['circle'], 'draw')).toBeNull();
  });

  it('names the shape for a single unsupported selection', () => {
    const reason = unsupportedReason(['g'], 'draw');
    expect(reason).toContain('group');
  });

  it('gives a generic message for a mixed multi-selection', () => {
    const reason = unsupportedReason(['circle', 'text'], 'draw');
    expect(reason).toMatch(/every selected shape/i);
  });
});

describe('friendlyTagName', () => {
  it('maps known tags to readable names and passes through unknowns', () => {
    expect(friendlyTagName('g')).toBe('group');
    expect(friendlyTagName('rect')).toBe('rectangle');
    expect(friendlyTagName('wibble')).toBe('wibble');
  });
});
