import type { AnimationDocument } from '../types/document';
import { createFrameRenderer } from '../core/frameRender';
import { frameTimes } from '../core/exportSampling';
import { applyCropToSvg, padRect, type Rect } from '../core/rasterCrop';
import { createFrameCanvas, drawSvgFrame } from './rasterize';
import { measureContentBounds } from './measureContentBounds';
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
/** Padding added around the measured content, as a fraction of its larger side. */
const CROP_PADDING_RATIO = 0.03;

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
  /** Crop the output to the animated content's union bounds across frames (SVG-143). */
  readonly cropToContent?: boolean;
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
  /** Content crop region in viewBox units, or null to render the full viewBox. */
  readonly crop: Rect | null;
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

/**
 * Resolve fps, scale, output size, and the frame-time grid for an export. When a
 * `crop` region is given the output is sized to it (fit-content); otherwise to
 * the full viewBox. Pure — the crop region is measured separately in the browser.
 */
export function planRasterExport(
  doc: AnimationDocument,
  options: Pick<RasterExportOptions, 'scale' | 'fps'> & { crop?: Rect | null },
): RasterPlan {
  const scale = clamp(options.scale ?? 1, MIN_SCALE, MAX_SCALE);
  const fps = clamp(Math.round(options.fps ?? doc.fps), MIN_FPS, MAX_FPS);
  const crop = options.crop ?? null;
  const region = crop ?? doc.viewBox;
  const width = Math.max(1, Math.round(region.w * scale));
  const height = Math.max(1, Math.round(region.h * scale));
  const times = frameTimes(doc.duration, fps);
  return { fps, scale, width, height, times, frameCount: times.length, crop };
}

export async function exportRaster(
  doc: AnimationDocument,
  options: RasterExportOptions,
): Promise<RasterExportResult> {
  const renderer = createFrameRenderer(doc, { hiddenIds: options.hiddenIds });

  // Fit-content: sample the animated bounds across the frame grid, then pad to
  // cover stroke/filter bleed. Falls back to the full viewBox if nothing renders.
  let crop: Rect | null = null;
  if (options.cropToContent) {
    const fps = clamp(Math.round(options.fps ?? doc.fps), MIN_FPS, MAX_FPS);
    const bounds = measureContentBounds(doc, frameTimes(doc.duration, fps), options.hiddenIds);
    if (bounds !== null) crop = padRect(bounds, Math.max(bounds.w, bounds.h) * CROP_PADDING_RATIO);
  }

  const plan = planRasterExport(doc, { scale: options.scale, fps: options.fps, crop });
  const { canvas, ctx } = createFrameCanvas(plan.width, plan.height);
  const rasterOptions = {
    width: plan.width,
    height: plan.height,
    background: options.background ?? null,
  };

  // Each frame is the rendered SVG, with its viewBox narrowed to the crop region
  // when fit-content is on so the content fills the output with no dead margins.
  const frameAt = (index: number): string => {
    const svg = renderer.renderAt(plan.times[index]!);
    return plan.crop === null ? svg : applyCropToSvg(svg, plan.crop);
  };

  if (options.format === 'webm') {
    const blob = await recordCanvasToWebm({
      canvas,
      fps: plan.fps,
      frameCount: plan.frameCount,
      drawFrame: (index) => drawSvgFrame(ctx, frameAt(index), rasterOptions),
      onProgress: (index) => options.onProgress?.(index + 1, plan.frameCount),
      signal: options.signal,
    });
    return { blob, frameCount: plan.frameCount, width: plan.width, height: plan.height };
  }

  const sink = createGifSink({ fps: plan.fps, loop: options.loop ?? true });
  for (let index = 0; index < plan.frameCount; index += 1) {
    if (options.signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    await drawSvgFrame(ctx, frameAt(index), rasterOptions);
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
