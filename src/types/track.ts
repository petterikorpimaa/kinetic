import type { Keyframe } from './keyframe';

/**
 * Properties whose keyframes hold a numeric value. Transform + opacity are
 * the v1 core; `draw` (stroke draw-on, 0–100%) and the filter properties
 * land in later milestones but are modelled here so the type is stable.
 */
export type NumericProperty =
  | 'x'
  | 'y'
  | 'scale'
  | 'scaleX'
  | 'scaleY'
  | 'rotation'
  | 'skewX'
  | 'skewY'
  | 'opacity'
  | 'strokeWidth'
  | 'draw'
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'hue'
  | 'shadowX'
  | 'shadowY'
  | 'shadowBlur';

/** Properties whose keyframes hold a colour (hex string). */
export type ColorProperty = 'fill' | 'stroke' | 'shadowColor';

export type AnimatableProperty = NumericProperty | ColorProperty;

/**
 * A track animates exactly ONE property of ONE element. Keyframes are kept
 * sorted by ascending `time`; `valueAt` and the serializers rely on this.
 */
export interface Track<TValue = number> {
  readonly id: string;
  readonly elementId: string;
  readonly property: AnimatableProperty;
  readonly keyframes: ReadonlyArray<Keyframe<TValue>>;
}

export type NumericTrack = Track<number>;
export type ColorTrack = Track<string>;

/** Any track in a document — numeric or colour. */
export type AnyTrack = NumericTrack | ColorTrack;
