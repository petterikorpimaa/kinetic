import type { AnimatableProperty, NumericProperty, ColorProperty } from '../types/track';

/** UI grouping for the add-property menu. */
export type PropertyGroup = 'Transform' | 'Appearance' | 'Filters';

interface NumberPropertyDef {
  readonly key: NumericProperty;
  readonly label: string;
  readonly kind: 'number';
  readonly group: PropertyGroup;
  readonly defaultValue: number;
  /** Display precision; 0 shows integers. */
  readonly decimals: number;
  /** Suffix shown after the value (e.g. `°`, `%`); empty for none. */
  readonly unit: string;
}

interface ColorPropertyDef {
  readonly key: ColorProperty;
  readonly label: string;
  readonly kind: 'color';
  readonly group: PropertyGroup;
  readonly defaultValue: string;
}

export type PropertyDef = NumberPropertyDef | ColorPropertyDef;

/**
 * The animatable properties exposed in the Inspector, in menu order. Values and
 * defaults mirror the demo. The Filters group (blur, drop-shadow, …) is added
 * in M4 alongside its filter-compositing apply path.
 */
export const PROPERTY_DEFS: readonly PropertyDef[] = [
  {
    key: 'x',
    label: 'Position X',
    kind: 'number',
    group: 'Transform',
    defaultValue: 0,
    decimals: 0,
    unit: '',
  },
  {
    key: 'y',
    label: 'Position Y',
    kind: 'number',
    group: 'Transform',
    defaultValue: 0,
    decimals: 0,
    unit: '',
  },
  {
    key: 'scale',
    label: 'Scale',
    kind: 'number',
    group: 'Transform',
    defaultValue: 1,
    decimals: 2,
    unit: '',
  },
  {
    key: 'scaleX',
    label: 'Scale X',
    kind: 'number',
    group: 'Transform',
    defaultValue: 1,
    decimals: 2,
    unit: '',
  },
  {
    key: 'scaleY',
    label: 'Scale Y',
    kind: 'number',
    group: 'Transform',
    defaultValue: 1,
    decimals: 2,
    unit: '',
  },
  {
    key: 'rotation',
    label: 'Rotation',
    kind: 'number',
    group: 'Transform',
    defaultValue: 0,
    decimals: 0,
    unit: '°',
  },
  {
    key: 'skewX',
    label: 'Skew X',
    kind: 'number',
    group: 'Transform',
    defaultValue: 0,
    decimals: 0,
    unit: '°',
  },
  {
    key: 'skewY',
    label: 'Skew Y',
    kind: 'number',
    group: 'Transform',
    defaultValue: 0,
    decimals: 0,
    unit: '°',
  },
  {
    key: 'opacity',
    label: 'Opacity',
    kind: 'number',
    group: 'Appearance',
    defaultValue: 1,
    decimals: 2,
    unit: '',
  },
  { key: 'fill', label: 'Fill', kind: 'color', group: 'Appearance', defaultValue: '#14b8a6' },
  { key: 'stroke', label: 'Stroke', kind: 'color', group: 'Appearance', defaultValue: '#14b8a6' },
  {
    key: 'strokeWidth',
    label: 'Stroke Width',
    kind: 'number',
    group: 'Appearance',
    defaultValue: 1,
    decimals: 1,
    unit: 'px',
  },
  {
    key: 'draw',
    label: 'Stroke Draw',
    kind: 'number',
    group: 'Appearance',
    defaultValue: 100,
    decimals: 0,
    unit: '%',
  },
  {
    key: 'blur',
    label: 'Blur',
    kind: 'number',
    group: 'Filters',
    defaultValue: 0,
    decimals: 1,
    unit: 'px',
  },
  {
    key: 'brightness',
    label: 'Brightness',
    kind: 'number',
    group: 'Filters',
    defaultValue: 1,
    decimals: 2,
    unit: '',
  },
  {
    key: 'contrast',
    label: 'Contrast',
    kind: 'number',
    group: 'Filters',
    defaultValue: 1,
    decimals: 2,
    unit: '',
  },
  {
    key: 'saturate',
    label: 'Saturate',
    kind: 'number',
    group: 'Filters',
    defaultValue: 1,
    decimals: 2,
    unit: '',
  },
  {
    key: 'grayscale',
    label: 'Grayscale',
    kind: 'number',
    group: 'Filters',
    defaultValue: 0,
    decimals: 2,
    unit: '',
  },
  {
    key: 'sepia',
    label: 'Sepia',
    kind: 'number',
    group: 'Filters',
    defaultValue: 0,
    decimals: 2,
    unit: '',
  },
  {
    key: 'invert',
    label: 'Invert',
    kind: 'number',
    group: 'Filters',
    defaultValue: 0,
    decimals: 2,
    unit: '',
  },
  {
    key: 'hue',
    label: 'Hue Rotate',
    kind: 'number',
    group: 'Filters',
    defaultValue: 0,
    decimals: 0,
    unit: '°',
  },
  {
    key: 'shadowX',
    label: 'Shadow X',
    kind: 'number',
    group: 'Filters',
    defaultValue: 0,
    decimals: 0,
    unit: 'px',
  },
  {
    key: 'shadowY',
    label: 'Shadow Y',
    kind: 'number',
    group: 'Filters',
    defaultValue: 4,
    decimals: 0,
    unit: 'px',
  },
  {
    key: 'shadowBlur',
    label: 'Shadow Blur',
    kind: 'number',
    group: 'Filters',
    defaultValue: 4,
    decimals: 0,
    unit: 'px',
  },
  {
    key: 'shadowColor',
    label: 'Shadow Color',
    kind: 'color',
    group: 'Filters',
    defaultValue: '#000000',
  },
];

export const PROPERTY_GROUPS: readonly PropertyGroup[] = ['Transform', 'Appearance', 'Filters'];

/**
 * Drop-shadow is four animatable tracks (offset X/Y, blur, colour) presented as
 * one expandable "Drop Shadow" entry in the menu and Inspector (SVG-59). The
 * first member is the primary value surfaced inline on the group's header row.
 */
export const DROP_SHADOW_MEMBERS = ['shadowX', 'shadowY', 'shadowBlur', 'shadowColor'] as const;
export const DROP_SHADOW_LABEL = 'Drop Shadow';

/** Short labels for the drop-shadow sub-rows (the group already names the effect). */
export const DROP_SHADOW_SUB_LABELS: Readonly<Record<string, string>> = {
  shadowX: 'Offset X',
  shadowY: 'Offset Y',
  shadowBlur: 'Blur',
  shadowColor: 'Color',
};

const DEF_BY_KEY = new Map<AnimatableProperty, PropertyDef>(
  PROPERTY_DEFS.map((def) => [def.key, def]),
);

export function getPropertyDef(key: AnimatableProperty): PropertyDef | undefined {
  return DEF_BY_KEY.get(key);
}

export function propertiesInGroup(group: PropertyGroup): readonly PropertyDef[] {
  return PROPERTY_DEFS.filter((def) => def.group === group);
}

/** Round a numeric value to its property's display precision, trimming zeros. */
export function formatNumber(def: NumberPropertyDef, value: number): string {
  const factor = 10 ** def.decimals;
  return (Math.round(value * factor) / factor).toString();
}
