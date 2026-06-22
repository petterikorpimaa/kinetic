import type { AnimationDocument } from '../types/document';
import { createFrameRenderer } from '../core/frameRender';
import { frameTimes } from '../core/exportSampling';
import { createFrameCanvas, drawSvgFrame } from './rasterize';
import { createGifSink } from './encodeGif';
import { recordCanvasToWebm } from './encodeWebm';

/**
 * Orchestrates raster export: sample the frame grid, render each frame to a
 * static SVG (same engine as the editor), rasterize it, and feed it to the
 * chosen encoder (GIF: stream pixels; WebM: record the canvas in real time).
 *
 * The planning math (`planRasterExport`) is pure and unit-tested; the pipeline
 * (`exportRaster`) is browser-only.
 */

export type RasterFormat = 'gif' | 'webm';

export const MIN_FPS = 1;
export const MAX_FPS = 60;
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

export interface RasterExportOptions {
  readonly format: RasterFormat;
  /** Output scale over the viewBox size. Clamped to [0.25, 4]. */
  readonly scale?: number;
  /** Frame rate; defaults to the document fps. Clamped to [1, 60]. */
  readonly fps?: number;
  /** Solid background painted behind the SVG; null leaves it transparent. */
  readonly background?: string | null;
  /** GIF loop forever (default true); ignored for WebM. */
  readonly loop?: boolean;
  readonly hiddenIds?: ReadonlySet<string>;
  readonly onProgress?: (done: number, total: number) => void;
  readonly signal?: AbortSignal;
}

export interface RasterPlan {
  readonly fps: number;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly times: number[];
  readonly frameCount: number;
}

export interface RasterExportResult {
  readonly blob: Blob;
  readonly frameCount: number;
  readonly width: number;
  readonly height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Resolve fps, scale, output size, and the frame-time grid for an export. */
export function planRasterExport(
  doc: AnimationDocument,
  options: Pick<RasterExportOptions, 'scale' | 'fps'>,
): RasterPlan {
  const scale = clamp(options.scale ?? 1, MIN_SCALE, MAX_SCALE);
  const fps = clamp(Math.round(options.fps ?? doc.fps), MIN_FPS, MAX_FPS);
  const width = Math.max(1, Math.round(doc.viewBox.w * scale));
  const height = Math.max(1, Math.round(doc.viewBox.h * scale));
  const times = frameTimes(doc.duration, fps);
  return { fps, scale, width, height, times, frameCount: times.length };
}

export async function exportRaster(
  doc: AnimationDocument,
  options: RasterExportOptions,
): Promise<RasterExportResult> {
  const plan = planRasterExport(doc, options);
  const renderer = createFrameRenderer(doc, { hiddenIds: options.hiddenIds });
  const { canvas, ctx } = createFrameCanvas(plan.width, plan.height);
  const rasterOptions = {
    width: plan.width,
    height: plan.height,
    background: options.background ?? null,
  };

  if (options.format === 'webm') {
    const blob = await recordCanvasToWebm({
      canvas,
      fps: plan.fps,
      frameCount: plan.frameCount,
      drawFrame: (index) => drawSvgFrame(ctx, renderer.renderAt(plan.times[index]!), rasterOptions),
      onProgress: (index) => options.onProgress?.(index + 1, plan.frameCount),
      signal: options.signal,
    });
    return { blob, frameCount: plan.frameCount, width: plan.width, height: plan.height };
  }

  const sink = createGifSink({ fps: plan.fps, loop: options.loop ?? true });
  for (let index = 0; index < plan.frameCount; index += 1) {
    if (options.signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    await drawSvgFrame(ctx, renderer.renderAt(plan.times[index]!), rasterOptions);
    sink.addFrame(ctx.getImageData(0, 0, plan.width, plan.height));
    options.onProgress?.(index + 1, plan.frameCount);
  }
  return {
    blob: sink.finish(),
    frameCount: plan.frameCount,
    width: plan.width,
    height: plan.height,
  };
}
