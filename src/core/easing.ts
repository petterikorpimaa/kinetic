import type { CubicBezierEasing } from '../types/easing';

/** Maps a normalized progress `x` in [0,1] to an eased output `y`. */
export type EasingFunction = (x: number) => number;

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 1e-6;
const SUBDIVISION_ITERATIONS = 20;
const PRECISION = 1e-5;

/**
 * Build an easing function from cubic-bezier control points P1 = (x1,y1) and
 * P2 = (x2,y2), with P0 = (0,0) and P3 = (1,1) implied.
 *
 * For a given `x` it solves the bezier's x(t) = x for the parameter `t`
 * (Newton-Raphson, then a bisection fallback for flat regions), then returns
 * y(t). Ported from the demo's `makeBezier`.
 */
export function makeCubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t;
  const sampleSlopeX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number): number => {
    let t = x;

    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < PRECISION) return sampleY(t);
      const slope = sampleSlopeX(t);
      if (Math.abs(slope) < NEWTON_MIN_SLOPE) break;
      t -= error / slope;
    }

    let low = 0;
    let high = 1;
    t = x;
    for (let i = 0; i < SUBDIVISION_ITERATIONS; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < PRECISION) break;
      if (error > 0) high = t;
      else low = t;
      t = (low + high) / 2;
    }

    return sampleY(t);
  };
}

const cache = new Map<string, EasingFunction>();

/**
 * Return the easing function for the given control points, memoised by the
 * tuple so repeated lookups during scrub/playback reuse the solver.
 */
export function cubicBezier(points: CubicBezierEasing): EasingFunction {
  const key = points.join(',');
  let fn = cache.get(key);
  if (fn === undefined) {
    fn = makeCubicBezier(points[0], points[1], points[2], points[3]);
    cache.set(key, fn);
  }
  return fn;
}
