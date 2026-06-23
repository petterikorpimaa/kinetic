import { describe, it, expect } from 'vitest';
import {
  SCALAR_FILTERS,
  isScalarFilter,
  scalarFilterCss,
  dropShadowCss,
  composeFilter,
} from './filters';

describe('isScalarFilter', () => {
  it('recognises the eight scalar filters and rejects others', () => {
    expect(SCALAR_FILTERS).toHaveLength(8);
    expect(isScalarFilter('blur')).toBe(true);
    expect(isScalarFilter('hue')).toBe(true);
    expect(isScalarFilter('opacity')).toBe(false);
    expect(isScalarFilter('shadowX')).toBe(false);
  });
});

describe('scalarFilterCss', () => {
  it('emits the right CSS function and unit per filter', () => {
    expect(scalarFilterCss('blur', 4)).toBe('blur(4px)');
    expect(scalarFilterCss('hue', 90)).toBe('hue-rotate(90deg)');
    expect(scalarFilterCss('brightness', 1.2)).toBe('brightness(1.2)');
    expect(scalarFilterCss('contrast', 0.8)).toBe('contrast(0.8)');
    expect(scalarFilterCss('saturate', 2)).toBe('saturate(2)');
    expect(scalarFilterCss('grayscale', 0.5)).toBe('grayscale(0.5)');
    expect(scalarFilterCss('sepia', 1)).toBe('sepia(1)');
    expect(scalarFilterCss('invert', 0.25)).toBe('invert(0.25)');
  });
});

describe('dropShadowCss', () => {
  it('composes offset, blur and colour', () => {
    expect(dropShadowCss(3, -2, 5, '#000000')).toBe('drop-shadow(3px -2px 5px #000000)');
  });
});

describe('composeFilter', () => {
  it('joins functions in order', () => {
    expect(composeFilter(['blur(2px)', 'brightness(1.1)'])).toBe('blur(2px) brightness(1.1)');
  });

  it('returns "none" when there are no active filters', () => {
    expect(composeFilter([])).toBe('none');
  });
});
