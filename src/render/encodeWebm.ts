/**
 * WebM video capture via the native MediaRecorder API (zero extra dependency).
 * MediaRecorder samples a canvas in real time, so the export runs for roughly
 * the animation's wall-clock duration and frame timing is approximate — the
 * trade-off accepted when WebM was chosen over a deterministic encoder.
 * Browser-only (no jsdom coverage).
 */

const WEBM_MIME_CANDIDATES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

/** The best-supported WebM mime type, or null when WebM recording is unavailable. */
export function pickWebmMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return WEBM_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** Whether this browser can record canvas frames to WebM. */
export function isWebmSupported(): boolean {
  return pickWebmMime() !== null;
}

export interface WebmRecordParams {
  readonly canvas: HTMLCanvasElement;
  readonly fps: number;
  readonly frameCount: number;
  /** Paint frame `index` onto the recorded canvas (may be async). */
  readonly drawFrame: (index: number) => Promise<void> | void;
  readonly onProgress?: (index: number) => void;
  readonly signal?: AbortSignal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Record a sequence of canvas frames to a WebM Blob, paced at `fps`. */
export async function recordCanvasToWebm(params: WebmRecordParams): Promise<Blob> {
  const mime = pickWebmMime();
  if (mime === null) throw new Error('WebM recording is not supported in this browser.');

  const { canvas, fps, frameCount, drawFrame, onProgress, signal } = params;
  const stream = canvas.captureStream(0);
  const [track] = stream.getVideoTracks();
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = () => reject(new Error('WebM recording failed.'));
  });

  recorder.start();
  const frameDelay = 1000 / fps;
  try {
    for (let index = 0; index < frameCount; index += 1) {
      if (signal?.aborted) break;
      await drawFrame(index);
      // `requestFrame` exists on a canvas capture track; capture the painted frame.
      (track as CanvasCaptureMediaStreamTrack | undefined)?.requestFrame();
      onProgress?.(index);
      await sleep(frameDelay);
    }
  } finally {
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
  }
  return finished;
}
