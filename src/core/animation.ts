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
  readonly scale: number;
  readonly rotation: number;
}

/**
 * SVG transform string matching the demo: translate position, then rotate and
 * scale about the element's bbox centre (`origin`) so rotation/scale pivot in
 * place rather than around the SVG origin.
 */
export function composeTransform(
  origin: { readonly x: number; readonly y: number },
  values: TransformValues,
): string {
  const { x: ox, y: oy } = origin;
  const { x, y, scale, rotation } = values;
  return (
    `translate(${x} ${y}) ` +
    `rotate(${rotation} ${ox} ${oy}) ` +
    `translate(${ox} ${oy}) scale(${scale}) translate(${-ox} ${-oy})`
  );
}

/** Stroke dash offset for a `draw` percentage (0–100) over a path of `length`. */
export function strokeDashOffset(length: number, drawPercent: number): number {
  return length * (1 - drawPercent / 100);
}
