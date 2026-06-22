import type { AnyTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';

/**
 * Sampling helpers shared by the CSS and GSAP serializers (framework-free).
 *
 * The serializers must turn independent per-property tracks into the merged
 * `transform` / `filter` properties CSS animates as a unit. These helpers find
 * the keyframe times a channel needs, decide whether the channel can be emitted
 * as a clean per-segment `cubic-bezier()` (all animated members share times and
 * eases) or must be baked per frame, and produce the frame grid for baking.
 */

/** Times closer than this are treated as the same keyframe time. */
const TIME_EPSILON = 1e-4;

/** Tracks with at least two keyframes actually vary over time. */
function isAnimated(track: AnyTrack): boolean {
  return track.keyframes.length >= 2;
}

function easingEqual(a: CubicBezierEasing, b: CubicBezierEasing): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

/** The sorted, epsilon-deduped union of every track's keyframe times. */
export function unionKeyframeTimes(tracks: readonly AnyTrack[]): number[] {
  const times: number[] = [];
  for (const track of tracks) {
    for (const keyframe of track.keyframes) times.push(keyframe.time);
  }
  times.sort((a, b) => a - b);
  const unique: number[] = [];
  for (const time of times) {
    const last = unique[unique.length - 1];
    if (last === undefined || Math.abs(time - last) > TIME_EPSILON) unique.push(time);
  }
  return unique;
}

/**
 * Whether a channel's member tracks can be emitted as clean per-segment
 * `cubic-bezier()` rather than baked. True when at most one member is animated,
 * or when every animated member shares the same keyframe times AND the same
 * outgoing easing at each shared time (the final keyframe's easing is unused).
 * Otherwise a single per-stop timing function can't represent the channel and
 * the serializer must bake it.
 */
export function tracksAreAligned(tracks: readonly AnyTrack[]): boolean {
  const animated = tracks.filter(isAnimated);
  if (animated.length <= 1) return true;

  const reference = animated[0]!.keyframes;
  for (const other of animated.slice(1)) {
    if (other.keyframes.length !== reference.length) return false;
    for (let i = 0; i < reference.length; i++) {
      if (Math.abs(other.keyframes[i]!.time - reference[i]!.time) > TIME_EPSILON) return false;
    }
    // Easing matters only on segments that exist — every keyframe but the last.
    for (let i = 0; i < reference.length - 1; i++) {
      if (!easingEqual(other.keyframes[i]!.easing, reference[i]!.easing)) return false;
    }
  }
  return true;
}

/** Frame times for baking a channel: `0, 1/fps, … , duration` (inclusive). */
export function frameTimes(duration: number, fps: number): number[] {
  const frames = Math.max(1, Math.round(duration * fps));
  const times: number[] = [];
  for (let i = 0; i <= frames; i++) times.push((i / frames) * duration);
  times[times.length - 1] = duration;
  return times;
}
