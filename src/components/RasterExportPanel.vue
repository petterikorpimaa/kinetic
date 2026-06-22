<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { Download, Loader, Film, Square } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { exportRaster, type RasterFormat } from '@/render/rasterExport';
import { isWebmSupported } from '@/render/encodeWebm';

// Render-and-download panel for the raster export formats (GIF, WebM video).
// Unlike the code tabs there is no text to preview — the user picks options,
// renders frames through the shared engine, then previews and downloads.
const props = defineProps<{ format: 'gif' | 'video' }>();

const store = useDocumentStore();

type Phase = 'idle' | 'rendering' | 'done' | 'error';

const SCALE_OPTIONS = [1, 2] as const;

const scale = ref(1);
const fps = ref(store.document.fps);
const background = ref('#ffffff');
const transparent = ref(false);
const loop = ref(true);

const phase = ref<Phase>('idle');
const done = ref(0);
const total = ref(0);
const resultUrl = ref<string | null>(null);
const resultSize = ref(0);
const errorMessage = ref('');
let controller: AbortController | null = null;

const webmSupported = isWebmSupported();
const isVideo = computed(() => props.format === 'video');
const formatLabel = computed(() => (isVideo.value ? 'WebM video' : 'GIF'));
const ext = computed(() => (isVideo.value ? 'webm' : 'gif'));
const rasterFormat = computed<RasterFormat>(() => (isVideo.value ? 'webm' : 'gif'));

const downloadName = computed(() => {
  const base = store.document.name.replace(/\.svg$/i, '').trim() || 'animation';
  return `${base}.${ext.value}`;
});

const progressPct = computed(() =>
  total.value === 0 ? 0 : Math.round((done.value / total.value) * 100),
);

const blocked = computed<string | null>(() => {
  if (store.document.elements.length === 0) return 'Import an SVG to render a frame.';
  if (isVideo.value && !webmSupported) return 'WebM recording is not supported in this browser.';
  return null;
});

function revokeResult(): void {
  if (resultUrl.value !== null) {
    URL.revokeObjectURL(resultUrl.value);
    resultUrl.value = null;
  }
}

function reset(): void {
  revokeResult();
  phase.value = 'idle';
  done.value = 0;
  total.value = 0;
  errorMessage.value = '';
}

async function render(): Promise<void> {
  reset();
  phase.value = 'rendering';
  controller = new AbortController();
  try {
    const result = await exportRaster(store.document, {
      format: rasterFormat.value,
      scale: scale.value,
      fps: fps.value,
      background: transparent.value ? null : background.value,
      loop: loop.value,
      hiddenIds: store.hiddenElementIds,
      onProgress: (d, t) => {
        done.value = d;
        total.value = t;
      },
      signal: controller.signal,
    });
    resultUrl.value = URL.createObjectURL(result.blob);
    resultSize.value = result.blob.size;
    phase.value = 'done';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      phase.value = 'idle';
      return;
    }
    errorMessage.value = error instanceof Error ? error.message : 'Export failed.';
    phase.value = 'error';
  } finally {
    controller = null;
  }
}

function cancel(): void {
  controller?.abort();
}

function download(): void {
  if (resultUrl.value === null) return;
  const link = document.createElement('a');
  link.href = resultUrl.value;
  link.download = downloadName.value;
  link.click();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Switching format or changing any option invalidates a rendered result.
watch([() => props.format, scale, fps, background, transparent, loop], reset);

onBeforeUnmount(revokeResult);
</script>

<template>
  <div class="raster" data-testid="raster-panel">
    <p v-if="blocked" class="raster__blocked">{{ blocked }}</p>

    <template v-else>
      <div class="raster__options">
        <label class="opt">
          <span class="opt__label">Size</span>
          <select v-model.number="scale" class="opt__field" data-testid="raster-scale">
            <option v-for="value in SCALE_OPTIONS" :key="value" :value="value">{{ value }}×</option>
          </select>
        </label>

        <label class="opt">
          <span class="opt__label">FPS</span>
          <input
            v-model.number="fps"
            type="number"
            min="1"
            max="60"
            class="opt__field"
            data-testid="raster-fps"
          />
        </label>

        <label class="opt">
          <span class="opt__label">Background</span>
          <span class="opt__bg">
            <input
              type="color"
              :value="background"
              :disabled="transparent"
              class="opt__color"
              @input="background = ($event.target as HTMLInputElement).value"
            />
            <label class="opt__check">
              <input v-model="transparent" type="checkbox" />
              Transparent
            </label>
          </span>
        </label>

        <label v-if="!isVideo" class="opt opt--inline">
          <input v-model="loop" type="checkbox" />
          <span class="opt__label">Loop forever</span>
        </label>
      </div>

      <p v-if="isVideo" class="raster__note">
        WebM records in real time, so a {{ store.document.duration }}s clip takes about that long to
        capture.
      </p>

      <div class="raster__stage">
        <template v-if="phase === 'done' && resultUrl">
          <img
            v-if="!isVideo"
            :src="resultUrl"
            class="raster__preview"
            data-testid="raster-preview"
            alt="Rendered GIF preview"
          />
          <video
            v-else
            :src="resultUrl"
            class="raster__preview"
            data-testid="raster-preview"
            autoplay
            loop
            muted
            playsinline
          />
        </template>
        <p v-else-if="phase === 'error'" class="raster__error">{{ errorMessage }}</p>
        <div v-else-if="phase === 'rendering'" class="raster__progress">
          <Loader :size="22" :stroke-width="1.6" class="raster__spin" />
          <div class="raster__bar"><span :style="{ width: `${progressPct}%` }" /></div>
          <span class="raster__count">{{ done }} / {{ total }} frames</span>
        </div>
        <div v-else class="raster__placeholder">
          <Film :size="26" :stroke-width="1.2" />
          <span>Render to preview your {{ formatLabel }}.</span>
        </div>
      </div>

      <div class="raster__actions">
        <button
          v-if="phase === 'rendering'"
          type="button"
          class="btn"
          data-testid="raster-cancel"
          @click="cancel"
        >
          <Square :size="13" :stroke-width="2" />
          Cancel
        </button>
        <button
          v-else
          type="button"
          class="btn btn--primary"
          data-testid="raster-render"
          @click="render"
        >
          <Film :size="14" :stroke-width="1.7" />
          {{ phase === 'done' ? 'Re-render' : `Render ${formatLabel}` }}
        </button>

        <button
          v-if="phase === 'done'"
          type="button"
          class="btn"
          data-testid="raster-download"
          @click="download"
        >
          <Download :size="14" :stroke-width="1.7" />
          {{ downloadName }} · {{ formatSize(resultSize) }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.raster {
  min-height: 380px;
  max-height: 56vh;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.raster__blocked {
  margin: auto;
  color: var(--dim);
  font-size: 13px;
}

.raster__options {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
}

.opt {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opt--inline {
  flex-direction: row;
  align-items: center;
  gap: 7px;
  height: 32px;
}

.opt__label {
  font-size: 11px;
  font-weight: 700;
  color: var(--dim);
}

.opt__field {
  height: 32px;
  width: 96px;
  padding: 0 9px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--txt);
  font-family: inherit;
  font-size: 12px;
}

.opt__bg {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 32px;
}

.opt__color {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: none;
  cursor: pointer;
}

.opt__color:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.opt__check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--dim);
  cursor: pointer;
}

.raster__note {
  margin: 0;
  font-size: 11.5px;
  color: var(--dim2);
}

.raster__stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--track);
  padding: 16px;
  overflow: hidden;
}

.raster__preview {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  background: repeating-conic-gradient(#ffffff10 0% 25%, transparent 0% 50%) 50% / 18px 18px;
}

.raster__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--dim2);
  font-size: 12.5px;
}

.raster__error {
  margin: 0;
  color: #f87171;
  font-size: 12.5px;
}

.raster__progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: min(80%, 320px);
}

.raster__spin {
  color: var(--acc2);
  animation: raster-spin 0.9s linear infinite;
}

@keyframes raster-spin {
  to {
    transform: rotate(360deg);
  }
}

.raster__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--elev);
  overflow: hidden;
}

.raster__bar span {
  display: block;
  height: 100%;
  background: var(--acc);
  transition: width 0.15s ease;
}

.raster__count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--dim);
}

.raster__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 13px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--txt);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn:hover {
  border-color: var(--dim2);
}

.btn--primary {
  border-color: var(--acc);
  color: var(--acc2);
}
</style>
