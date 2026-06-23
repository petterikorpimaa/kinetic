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

/** Whether a track's value actually changes across any of its segments. */
function trackChanges(track: AnyTrack): boolean {
  const keyframes = track.keyframes;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i]!.value !== keyframes[i + 1]!.value) return true;
  }
  return false;
}

/**
 * Sorted, epsilon-deduped stop times for a clean channel merge: the keyframe
 * times of the members that actually change, plus the 0 and `duration`
 * boundaries. Constant members contribute no times, so their keyframes never
 * split another member's eased segment.
 */
function mergeStopTimes(tracks: readonly AnyTrack[], duration: number): number[] {
  const times = [0, duration];
  for (const track of tracks) {
    if (track.keyframes.length < 2 || !trackChanges(track)) continue;
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
 * How one track behaves over the segment `[t0, t1]`:
 *  - its outgoing easing, when `[t0, t1]` is exactly one of the track's segments
 *    and the value changes across it;
 *  - `'constant'`, when the track holds a single value across `[t0, t1]`;
 *  - `'split'`, when `[t0, t1]` is a strict sub-interval of a *changing* segment
 *    (so the track's bezier would be cut and can't be reproduced per-segment).
 */
function classifyTrackSegment(
  track: AnyTrack,
  t0: number,
  t1: number,
): CubicBezierEasing | 'constant' | 'split' {
  const keyframes = track.keyframes;
  if (keyframes.length < 2) return 'constant'; // no segment to interpolate
  const first = keyframes[0]!;
  const last = keyframes[keyframes.length - 1]!;
  if (t1 <= first.time + TIME_EPSILON) return 'constant'; // before the first keyframe
  if (t0 >= last.time - TIME_EPSILON) return 'constant'; // after the last keyframe

  let segment = 0;
  while (segment < keyframes.length - 1 && keyframes[segment + 1]!.time <= t0 + TIME_EPSILON) {
    segment += 1;
  }
  const a = keyframes[segment]!;
  const b = keyframes[segment + 1]!;
  if (a.value === b.value) return 'constant';
  if (Math.abs(t0 - a.time) <= TIME_EPSILON && Math.abs(t1 - b.time) <= TIME_EPSILON)
    return a.easing;
  return 'split';
}

/** The single easing governing `[t0, t1]`, `'constant'` when nothing moves, or `'bake'`. */
function segmentEasing(
  tracks: readonly AnyTrack[],
  t0: number,
  t1: number,
): CubicBezierEasing | 'constant' | 'bake' {
  let easing: CubicBezierEasing | null = null;
  for (const track of tracks) {
    const result = classifyTrackSegment(track, t0, t1);
    if (result === 'split') return 'bake';
    if (result === 'constant') continue;
    if (easing === null) easing = result;
    else if (!easingEqual(easing, result)) return 'bake'; // two members ease differently at once
  }
  return easing === null ? 'constant' : easing;
}

export interface MergedStop {
  readonly time: number;
  /** Outgoing easing for the segment after this stop; undefined when constant or last. */
  readonly easing?: CubicBezierEasing;
}

/**
 * Plan a clean per-segment merge of a channel's member tracks (transform /
 * filter): one stop at every union keyframe time of the changing members, each
 * carrying the single `cubic-bezier()` that governs its outgoing segment. This
 * generalizes strict alignment — disjoint members (e.g. rotate, then scale) merge
 * cleanly because only one moves per segment. Returns null when a segment can't
 * be expressed with one timing function (a member's eased segment is split, or
 * two members ease differently at once), so the serializer bakes per frame.
 */
export function mergedChannelStops(
  tracks: readonly AnyTrack[],
  duration: number,
): MergedStop[] | null {
  const times = mergeStopTimes(tracks, duration);
  const stops: MergedStop[] = [];
  for (let i = 0; i < times.length; i++) {
    const time = times[i]!;
    const next = times[i + 1];
    if (next === undefined) {
      stops.push({ time });
      break;
    }
    const easing = segmentEasing(tracks, time, next);
    if (easing === 'bake') return null;
    stops.push(easing === 'constant' ? { time } : { time, easing });
  }
  return stops;
}

/** Frame times for baking a channel: `0, 1/fps, … , duration` (inclusive). */
export function frameTimes(duration: number, fps: number): number[] {
  const frames = Math.max(1, Math.round(duration * fps));
  const times: number[] = [];
  for (let i = 0; i <= frames; i++) times.push((i / frames) * duration);
  times[times.length - 1] = duration;
  return times;
}
