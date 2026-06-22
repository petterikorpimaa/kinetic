import type { CubicBezierEasing } from '../types/easing';

export interface EasingPreset {
  readonly name: string;
  readonly value: CubicBezierEasing;
}

/** Named easing presets (control points ported from the demo). */
export const EASING_PRESETS: readonly EasingPreset[] = [
  { name: 'Linear', value: [0, 0, 1, 1] },
  { name: 'Ease', value: [0.25, 0.1, 0.25, 1] },
  { name: 'In', value: [0.42, 0, 1, 1] },
  { name: 'Out', value: [0, 0, 0.58, 1] },
  { name: 'In-Out', value: [0.42, 0, 0.58, 1] },
  { name: 'Back', value: [0.34, 1.56, 0.64, 1] },
  { name: 'Overshoot', value: [0.68, -0.55, 0.27, 1.55] },
];

/** Default easing applied to new keyframes (ease-in-out). */
export const DEFAULT_EASING: CubicBezierEasing = [0.42, 0, 0.58, 1];

/** Find the preset matching the given control points, if any. */
export function matchPreset(points: CubicBezierEasing): EasingPreset | undefined {
  return EASING_PRESETS.find(
    (preset) =>
      preset.value[0] === points[0] &&
      preset.value[1] === points[1] &&
      preset.value[2] === points[2] &&
      preset.value[3] === points[3],
  );
}
