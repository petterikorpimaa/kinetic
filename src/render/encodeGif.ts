import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Streaming GIF assembler over `gifenc`. Frames are pushed one at a time so the
 * orchestrator never holds every frame's pixels at once — only the growing GIF
 * byte buffer. Each frame is quantized to its own 256-colour palette for
 * faithful colour, then assembled. Browser-only (no jsdom coverage).
 */

export interface GifEncodeOptions {
  readonly fps: number;
  /** Loop forever (true) or play once (false). */
  readonly loop: boolean;
}

export interface GifSink {
  addFrame(frame: ImageData): void;
  finish(): Blob;
}

export function createGifSink(options: GifEncodeOptions): GifSink {
  const encoder = GIFEncoder();
  const delay = Math.max(1, Math.round(1000 / options.fps));
  const repeat = options.loop ? 0 : -1;
  let frameIndex = 0;

  function addFrame(frame: ImageData): void {
    const palette = quantize(frame.data, 256);
    const indexed = applyPalette(frame.data, palette);
    encoder.writeFrame(indexed, frame.width, frame.height, {
      palette,
      delay,
      // `repeat` is honoured only on the first frame.
      repeat: frameIndex === 0 ? repeat : undefined,
    });
    frameIndex += 1;
  }

  function finish(): Blob {
    encoder.finish();
    // Copy into a fresh ArrayBuffer-backed array so it satisfies BlobPart.
    const bytes = Uint8Array.from(encoder.bytes());
    return new Blob([bytes], { type: 'image/gif' });
  }

  return { addFrame, finish };
}
