<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { Download, Loader, Film, Square } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { exportRaster, type RasterFormat } from '@/render/rasterExport';
import { isWebmSupported } from '@/render/encodeWebm';
import styles from './RasterExportPanel.module.css';

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
  <div :class="styles.raster" data-testid="raster-panel">
    <p v-if="blocked" :class="styles.blocked">{{ blocked }}</p>

    <template v-else>
      <div :class="styles.options">
        <label :class="styles.opt">
          <span :class="styles.optLabel">Size</span>
          <select v-model.number="scale" :class="styles.optField" data-testid="raster-scale">
            <option v-for="value in SCALE_OPTIONS" :key="value" :value="value">{{ value }}×</option>
          </select>
        </label>

        <label :class="styles.opt">
          <span :class="styles.optLabel">FPS</span>
          <input
            v-model.number="fps"
            type="number"
            min="1"
            max="60"
            :class="styles.optField"
            data-testid="raster-fps"
          />
        </label>

        <label :class="styles.opt">
          <span :class="styles.optLabel">Background</span>
          <span :class="styles.optBg">
            <input
              type="color"
              :value="background"
              :disabled="transparent"
              :class="styles.optColor"
              @input="background = ($event.target as HTMLInputElement).value"
            />
            <label :class="styles.optCheck">
              <input v-model="transparent" type="checkbox" />
              Transparent
            </label>
          </span>
        </label>

        <label v-if="!isVideo" :class="[styles.opt, styles.inline]">
          <input v-model="loop" type="checkbox" />
          <span :class="styles.optLabel">Loop forever</span>
        </label>
      </div>

      <p v-if="isVideo" :class="styles.note">
        WebM records in real time, so a {{ store.document.duration }}s clip takes about that long to
        capture.
      </p>

      <div :class="styles.stage">
        <template v-if="phase === 'done' && resultUrl">
          <img
            v-if="!isVideo"
            :src="resultUrl"
            :class="styles.preview"
            data-testid="raster-preview"
            alt="Rendered GIF preview"
          />
          <video
            v-else
            :src="resultUrl"
            :class="styles.preview"
            data-testid="raster-preview"
            autoplay
            loop
            muted
            playsinline
          />
        </template>
        <p v-else-if="phase === 'error'" :class="styles.error">{{ errorMessage }}</p>
        <div v-else-if="phase === 'rendering'" :class="styles.progress">
          <Loader :size="22" :stroke-width="1.6" :class="styles.spin" />
          <div :class="styles.bar"><span :style="{ width: `${progressPct}%` }" /></div>
          <span :class="styles.count">{{ done }} / {{ total }} frames</span>
        </div>
        <div v-else :class="styles.placeholder">
          <Film :size="26" :stroke-width="1.2" />
          <span>Render to preview your {{ formatLabel }}.</span>
        </div>
      </div>

      <div :class="styles.actions">
        <button
          v-if="phase === 'rendering'"
          type="button"
          :class="styles.btn"
          data-testid="raster-cancel"
          @click="cancel"
        >
          <Square :size="13" :stroke-width="2" />
          Cancel
        </button>
        <button
          v-else
          type="button"
          :class="[styles.btn, styles.primary]"
          data-testid="raster-render"
          @click="render"
        >
          <Film :size="14" :stroke-width="1.7" />
          {{ phase === 'done' ? 'Re-render' : `Render ${formatLabel}` }}
        </button>

        <button
          v-if="phase === 'done'"
          type="button"
          :class="styles.btn"
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
