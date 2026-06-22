import type { CubicBezierEasing } from './easing';

/**
 * One animatable value at one point in time on a track.
 *
 * - `time` is in SECONDS. The model is seconds-only; conversion to
 *   milliseconds happens solely at the GSAP / export boundaries.
 * - `easing` is the curve of the segment LEAVING this keyframe toward the
 *   next one (the keyframe "owns" its outgoing segment). This mirrors CSS
 *   `animation-timing-function`, which is declared on the start keyframe of
 *   a segment — keeping the editor and the CSS export in agreement. The
 *   final keyframe's `easing` is unused (it has no outgoing segment).
 */
export interface Keyframe<TValue = number> {
  readonly id: string;
  readonly time: number;
  readonly value: TValue;
  readonly easing: CubicBezierEasing;
}

export type NumericKeyframe = Keyframe<number>;
export type ColorKeyframe = Keyframe<string>;
