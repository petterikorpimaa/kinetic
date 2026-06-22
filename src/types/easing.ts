/**
 * A keyframe's easing is a cubic-bezier control pair `[x1, y1, x2, y2]`,
 * with the curve's endpoints P0 = (0,0) and P3 = (1,1) implied.
 *
 * This matches the demo's draggable easing editor: named presets (see
 * `src/core/presets.ts`) simply write one of these tuples. `y` may exceed
 * the [0,1] range to allow overshoot (the Back / Overshoot presets).
 */
export type CubicBezierEasing = [x1: number, y1: number, x2: number, y2: number];
