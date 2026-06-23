import type { NumericTrack, ColorTrack } from '../types/track';
import { valueAt } from './valueAt';
import { interpolateKeyframes } from './interpolate';
import { mixHexColor } from './color';

const KEYFRAME_SNAP_SECONDS = 0.04;

/** Numeric value of a track at `time`, falling back when the track is empty. */
export function sampleNumber(
  track: NumericTrack | undefined,
  time: number,
  fallback: number,
): number {
  if (track === undefined || track.keyframes.length === 0) return fallback;
  return valueAt(track, time);
}

/** Colour value of a track at `time`, falling back when the track is empty. */
export function sampleColor(track: ColorTrack | undefined, time: number, fallback: string): string {
  if (track === undefined || track.keyframes.length === 0) return fallback;
  return interpolateKeyframes(track.keyframes, time, mixHexColor);
}

/** True when a keyframe sits at `time` (within the editor's snap tolerance). */
export function hasKeyframeAt(
  keyframes: ReadonlyArray<{ readonly time: number }>,
  time: number,
): boolean {
  return keyframes.some((keyframe) => Math.abs(keyframe.time - time) < KEYFRAME_SNAP_SECONDS);
}

export interface TransformValues {
  readonly x: number;
  readonly y: number;
  /** Uniform scale; multiplies the per-axis factors. */
  readonly scale: number;
  /** Per-axis scale factors (default 1); combine with `scale` multiplicatively. */
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly rotation: number;
  /** Shear angles in degrees (default 0). */
  readonly skewX?: number;
  readonly skewY?: number;
}

/**
 * SVG transform string matching the demo: translate position, then rotate,
 * scale and skew about the element's bbox centre (`origin`) so they pivot in
 * place rather than around the SVG origin. Uniform `scale` multiplies the
 * per-axis `scaleX`/`scaleY`; skew applies after scale.
 */
export function composeTransform(
  origin: { readonly x: number; readonly y: number },
  values: TransformValues,
): string {
  const { x: ox, y: oy } = origin;
  const { x, y, scale, rotation, scaleX = 1, scaleY = 1, skewX = 0, skewY = 0 } = values;
  const sx = scale * scaleX;
  const sy = scale * scaleY;
  const scalePart = sx === sy ? `scale(${sx})` : `scale(${sx} ${sy})`;
  const skewParts = [skewX !== 0 ? `skewX(${skewX})` : '', skewY !== 0 ? `skewY(${skewY})` : ''];
  const pivoted = [scalePart, ...skewParts].filter((part) => part !== '').join(' ');
  return (
    `translate(${x} ${y}) ` +
    `rotate(${rotation} ${ox} ${oy}) ` +
    `translate(${ox} ${oy}) ${pivoted} translate(${-ox} ${-oy})`
  );
}

/** Stroke dash offset for a `draw` percentage (0–100) over a path of `length`. */
export function strokeDashOffset(length: number, drawPercent: number): number {
  return length * (1 - drawPercent / 100);
}
