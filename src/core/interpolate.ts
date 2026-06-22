import type { Keyframe } from '../types/keyframe';
import { cubicBezier } from './easing';

/**
 * Eased interpolation across a sorted, non-empty keyframe list — the single
 * routine behind both numeric (`valueAt`) and colour sampling, so easing and
 * clamping behave identically everywhere.
 *
 * Clamps to the first/last value outside the keyframe range (no extrapolation).
 * Within a segment, eases progress by the LEFT keyframe's `easing` (it owns its
 * outgoing segment) and blends the endpoints with `lerp`.
 */
export function interpolateKeyframes<TValue>(
  keyframes: ReadonlyArray<Keyframe<TValue>>,
  time: number,
  lerp: (from: TValue, to: TValue, progress: number) => TValue,
): TValue {
  const count = keyframes.length;
  if (count === 0) {
    throw new Error('interpolateKeyframes: keyframes must be non-empty');
  }

  const first = keyframes[0]!;
  if (time <= first.time) return first.value;

  const last = keyframes[count - 1]!;
  if (time >= last.time) return last.value;

  for (let i = 0; i < count - 1; i++) {
    const from = keyframes[i]!;
    const to = keyframes[i + 1]!;
    if (time >= from.time && time <= to.time) {
      const span = to.time - from.time;
      if (span <= 0) return to.value;
      const progress = (time - from.time) / span;
      const eased = cubicBezier(from.easing)(progress);
      return lerp(from.value, to.value, eased);
    }
  }

  // Unreachable given the clamps above, but keeps the function total.
  return last.value;
}
