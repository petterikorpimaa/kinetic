import type { NumericProperty } from '../types/track';

/**
 * CSS `filter` emitters for the animatable filter properties (framework-free).
 * Each scalar filter maps to one CSS filter function; drop-shadow is composed
 * from the shadowX/shadowY offsets (px) and shadowColor. Functions are emitted
 * in a canonical order so the editor preview and the CSS export agree.
 */

/** Scalar filter properties, in canonical emit order. */
export const SCALAR_FILTERS = [
  'blur',
  'brightness',
  'contrast',
  'saturate',
  'grayscale',
  'sepia',
  'invert',
  'hue',
] as const;

export type ScalarFilter = (typeof SCALAR_FILTERS)[number];

const SCALAR_FILTER_SET: ReadonlySet<string> = new Set(SCALAR_FILTERS);

export function isScalarFilter(property: NumericProperty): property is ScalarFilter {
  return SCALAR_FILTER_SET.has(property);
}

/** The single CSS filter function for a scalar filter at `value`. */
export function scalarFilterCss(property: ScalarFilter, value: number): string {
  switch (property) {
    case 'blur':
      return `blur(${value}px)`;
    case 'hue':
      return `hue-rotate(${value}deg)`;
    case 'brightness':
      return `brightness(${value})`;
    case 'contrast':
      return `contrast(${value})`;
    case 'saturate':
      return `saturate(${value})`;
    case 'grayscale':
      return `grayscale(${value})`;
    case 'sepia':
      return `sepia(${value})`;
    case 'invert':
      return `invert(${value})`;
  }
}

/** A `drop-shadow()` from an offset (px) and a colour. */
export function dropShadowCss(x: number, y: number, color: string): string {
  return `drop-shadow(${x}px ${y}px ${color})`;
}

/** Join filter functions into a `filter` value, or `'none'` when there are none. */
export function composeFilter(parts: readonly string[]): string {
  return parts.length === 0 ? 'none' : parts.join(' ');
}
