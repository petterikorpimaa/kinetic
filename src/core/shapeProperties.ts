import type { AnimatableProperty } from '../types/track';
import { PROPERTY_DEFS } from './properties';

/**
 * Not every animatable property makes sense on every SVG shape:
 *  - `fill` needs a paint region — a `<line>` has none, a raster `<image>` isn't painted via fill.
 *  - `draw` (stroke draw-on) needs stroke geometry with a measurable path length — `<text>`,
 *    `<image>` and `<g>` have none.
 * Transform, opacity and the CSS filters apply to any rendered element, so they're universal.
 */

/** Shapes that can be painted with a fill (groups/instances cascade fill to children). */
const FILLABLE_TAGS: ReadonlySet<string> = new Set([
  'rect',
  'circle',
  'ellipse',
  'polygon',
  'polyline',
  'path',
  'text',
  'g',
  'use',
]);

/** Shapes whose stroke has a length for the draw-on effect (`getTotalLength`). */
const STROKE_DRAWABLE_TAGS: ReadonlySet<string> = new Set([
  'rect',
  'circle',
  'ellipse',
  'polygon',
  'polyline',
  'path',
  'line',
]);

/** Shapes that can take a stroke (colour/width). Everything paintable, plus lines; a raster image can't. */
const STROKEABLE_TAGS: ReadonlySet<string> = new Set([...FILLABLE_TAGS, 'line']);

/** Tags we have an opinion about; an unknown tag is treated permissively. */
const KNOWN_TAGS: ReadonlySet<string> = new Set([
  ...FILLABLE_TAGS,
  ...STROKE_DRAWABLE_TAGS,
  'image',
]);

const FRIENDLY_TAG: Readonly<Record<string, string>> = {
  rect: 'rectangle',
  circle: 'circle',
  ellipse: 'ellipse',
  line: 'line',
  polyline: 'polyline',
  polygon: 'polygon',
  path: 'path',
  text: 'text',
  image: 'image',
  g: 'group',
  use: 'instance',
};

/** Whether a single shape (by tag) supports animating a given property. */
export function isPropertySupported(tag: string, property: AnimatableProperty): boolean {
  if (!KNOWN_TAGS.has(tag)) return true; // unknown shape — don't block
  if (property === 'fill') return FILLABLE_TAGS.has(tag);
  if (property === 'draw') return STROKE_DRAWABLE_TAGS.has(tag);
  if (property === 'stroke' || property === 'strokeWidth') return STROKEABLE_TAGS.has(tag);
  return true; // transform / opacity / filters are universal
}

/** Whether every selected shape supports the property (intersection); false for none selected. */
export function isPropertySupportedByAll(
  tags: readonly string[],
  property: AnimatableProperty,
): boolean {
  return tags.length > 0 && tags.every((tag) => isPropertySupported(tag, property));
}

/** The full set of properties a shape type supports, in catalogue order. */
export function supportedPropertiesForTag(tag: string): AnimatableProperty[] {
  return PROPERTY_DEFS.map((def) => def.key).filter((key) => isPropertySupported(tag, key));
}

/** Readable shape name for tooltips; passes unknown tags through unchanged. */
export function friendlyTagName(tag: string): string {
  return FRIENDLY_TAG[tag] ?? tag;
}

/**
 * Why a property is unavailable for the current selection, or null when it's
 * supported. Names the shape for a single selection; generic when shapes differ.
 */
export function unsupportedReason(
  tags: readonly string[],
  property: AnimatableProperty,
): string | null {
  if (isPropertySupportedByAll(tags, property)) return null;
  if (tags.length === 1) {
    return `A ${friendlyTagName(tags[0]!)} shape doesn't support this property.`;
  }
  return `Not every selected shape supports this property.`;
}
