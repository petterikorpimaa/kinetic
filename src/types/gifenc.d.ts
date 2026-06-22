/**
 * Minimal ambient types for `gifenc` (ships no `.d.ts`). Covers only the
 * surface this app uses: per-frame quantize + palette + GIF assembly.
 * See https://github.com/mattdesl/gifenc for the full API.
 */
declare module 'gifenc' {
  /** A colour palette: an array of `[r, g, b]` or `[r, g, b, a]` tuples. */
  export type Palette = number[][];

  export type QuantizeFormat = 'rgb565' | 'rgb444' | 'rgba4444';

  export interface WriteFrameOptions {
    palette?: Palette;
    /** Frame delay in milliseconds. */
    delay?: number;
    /** Loop count, honoured on the first frame: 0 = forever, -1 = play once. */
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface GifEncoderInstance {
    writeFrame(
      index: Uint8Array | number[],
      width: number,
      height: number,
      options?: WriteFrameOptions,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export interface GifEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export function GIFEncoder(options?: GifEncoderOptions): GifEncoderInstance;

  export interface QuantizeOptions {
    format?: QuantizeFormat;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
    oneBitAlpha?: boolean | number;
  }

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions,
  ): Palette;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: QuantizeFormat,
  ): Uint8Array;
}
