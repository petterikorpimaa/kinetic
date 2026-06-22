import type { CubicBezierEasing } from '../types/easing';

/**
 * Geometry for the cubic-bezier easing editor (framework-free). The curve runs
 * from P0 = (0,0) to P3 = (1,1) through the two editable control points; `x`
 * (progress) is clamped to [0,1] and `y` (output) to [Y_MIN, Y_MAX], which
 * leaves headroom below 0 and above 1 for overshoot eases (Back/Overshoot).
 *
 * The editor draws in a square viewBox of side `size`. `y` grows upward in
 * easing space but downward in SVG, so the mapping flips it.
 */
export const CURVE_Y_MIN = -0.6;
export const CURVE_Y_MAX = 1.6;
const Y_SPAN = CURVE_Y_MAX - CURVE_Y_MIN;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Clamp control points to the editor's domain: x ∈ [0,1], y ∈ [Y_MIN, Y_MAX]. */
export function clampControlPoints(points: CubicBezierEasing): CubicBezierEasing {
  return [
    clamp(points[0], 0, 1),
    clamp(points[1], CURVE_Y_MIN, CURVE_Y_MAX),
    clamp(points[2], 0, 1),
    clamp(points[3], CURVE_Y_MIN, CURVE_Y_MAX),
  ];
}

export interface ViewPoint {
  readonly x: number;
  readonly y: number;
}

/** Map an easing value (x ∈ [0,1], y ∈ [Y_MIN,Y_MAX]) to viewBox pixels. */
export function toViewBox(x: number, y: number, size: number): ViewPoint {
  return { x: x * size, y: ((CURVE_Y_MAX - y) / Y_SPAN) * size };
}

/** Inverse of `toViewBox`: viewBox pixels back to an (unclamped) easing value. */
export function fromViewBox(px: number, py: number, size: number): ViewPoint {
  return { x: px / size, y: CURVE_Y_MAX - (py / size) * Y_SPAN };
}

/** SVG cubic path for the curve through both control points, in viewBox pixels. */
export function curvePath(points: CubicBezierEasing, size: number): string {
  const start = toViewBox(0, 0, size);
  const c1 = toViewBox(points[0], points[1], size);
  const c2 = toViewBox(points[2], points[3], size);
  const end = toViewBox(1, 1, size);
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
}

/** Format control points as a CSS `cubic-bezier(...)` string (3-decimal). */
export function cubicBezierCss(points: CubicBezierEasing): string {
  const round = (n: number): number => Math.round(n * 1000) / 1000;
  return `cubic-bezier(${points.map(round).join(', ')})`;
}
