/**
 * Browser-only SVG rasterization. Loads a static SVG frame (from
 * `createFrameRenderer`) into an <img> and paints it onto a 2D canvas, where it
 * can be read back as pixels (GIF) or recorded (WebM). Not unit-tested — jsdom
 * cannot rasterize SVG; covered by the export E2E flow.
 */

export interface RasterizeOptions {
  readonly width: number;
  readonly height: number;
  /** Solid fill painted before the SVG; null/empty leaves it transparent. */
  readonly background?: string | null;
}

/** Decode an SVG string into an Image, revoking the object URL once loaded. */
export function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize an SVG frame.'));
    };
    image.src = url;
  });
}

/** Paint an SVG frame onto a context, scaled to fill `width`×`height`. */
export async function drawSvgFrame(
  ctx: CanvasRenderingContext2D,
  svg: string,
  options: RasterizeOptions,
): Promise<void> {
  const image = await loadSvgImage(svg);
  ctx.clearRect(0, 0, options.width, options.height);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, options.width, options.height);
  }
  ctx.drawImage(image, 0, 0, options.width, options.height);
}

/** Create an offscreen canvas + context sized for rendering frames. */
export function createFrameCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Could not get a 2D canvas context for export.');
  return { canvas, ctx };
}
