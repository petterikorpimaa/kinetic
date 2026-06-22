import type { NumericTrack } from '../types/track';
import { interpolateKeyframes } from './interpolate';

function lerpNumber(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/**
 * The single source of truth for an interpolated numeric value.
 *
 * Editor preview/scrub, GSAP playback, and the export sampler all read from
 * this one function — never from each other — so the editor, the scrubbed
 * frame, and the exported CSS never diverge. Clamps outside the keyframe range
 * and eases by the LEFT keyframe's curve (see `interpolateKeyframes`).
 *
 * The track's `keyframes` must be sorted by ascending `time` (the document
 * store guarantees this) and must be non-empty.
 */
export function valueAt(track: NumericTrack, time: number): number {
  if (track.keyframes.length === 0) {
    throw new Error(`valueAt: track "${track.id}" has no keyframes`);
  }
  return interpolateKeyframes(track.keyframes, time, lerpNumber);
}
