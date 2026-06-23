<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { X, Check, Copy, Download } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { exportCss } from '@/core/cssExport';
import { exportGsap } from '@/core/gsapExport';
import RasterExportPanel from '../RasterExportPanel/RasterExportPanel.vue';
import styles from './ExportDialog.module.css';

type CodeFormat = 'svg' | 'css' | 'gsap';
type Format = CodeFormat | 'gif' | 'video';

const emit = defineEmits<{ close: [] }>();
const store = useDocumentStore();

const TABS: readonly { id: Format; label: string }[] = [
  { id: 'svg', label: 'SVG' },
  { id: 'css', label: 'CSS' },
  { id: 'gsap', label: 'GSAP' },
  { id: 'gif', label: 'GIF' },
  { id: 'video', label: 'Video' },
];
const CODE_META: Record<CodeFormat, { ext: string; mime: string }> = {
  svg: { ext: 'svg', mime: 'image/svg+xml' },
  css: { ext: 'css', mime: 'text/css' },
  gsap: { ext: 'js', mime: 'text/javascript' },
};

function isCodeFormat(value: Format): value is CodeFormat {
  return value === 'css' || value === 'gsap' || value === 'svg';
}

const format = ref<Format>('css');
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

// In the raster branch `format` is always 'gif' or 'video'; narrow it for the panel.
const rasterFormat = computed<'gif' | 'video'>(() => (format.value === 'video' ? 'video' : 'gif'));

function generate(which: CodeFormat): string {
  if (which === 'css') return exportCss(store.document);
  if (which === 'gsap') return exportGsap(store.document);
  return store.document.svgMarkup || '<!-- Import an SVG to export its markup. -->';
}

const code = computed(() => (isCodeFormat(format.value) ? generate(format.value) : ''));

const downloadName = computed(() => {
  const base = store.document.name.replace(/\.svg$/i, '').trim() || 'animation';
  const ext = isCodeFormat(format.value) ? CODE_META[format.value].ext : 'txt';
  return `${base}.${ext}`;
});

function setFormat(next: Format): void {
  if (format.value === next) return;
  format.value = next;
  copied.value = false;
}

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(code.value);
    copied.value = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => (copied.value = false), 1600);
  } catch {
    // Clipboard may be blocked (denied permission / insecure context); the user
    // can still select the code manually. Don't surface a hard error.
  }
}

function download(): void {
  if (!isCodeFormat(format.value)) return;
  const blob = new Blob([code.value], { type: `${CODE_META[format.value].mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName.value;
  link.click();
  URL.revokeObjectURL(url);
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
});
</script>

<template>
  <div :class="styles.overlay" data-testid="export-overlay" @click="emit('close')">
    <div :class="styles.dialog" data-testid="export-dialog" @click.stop>
      <div :class="styles.head">
        <div>
          <h2 :class="styles.title">Export animation</h2>
          <p :class="styles.lead">
            Clean, pasteable code — sampled from the same engine as the editor.
          </p>
        </div>
        <button type="button" :class="styles.close" title="Close" @click="emit('close')">
          <X :size="15" :stroke-width="1.6" />
        </button>
      </div>

      <div :class="styles.bar">
        <div :class="styles.tabs" role="tablist">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            type="button"
            role="tab"
            :class="[styles.tab, format === tab.id ? styles.active : '']"
            :data-testid="`export-tab-${tab.id}`"
            :aria-selected="format === tab.id"
            @click="setFormat(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="isCodeFormat(format)" :class="styles.actions">
          <button
            type="button"
            :class="styles.action"
            title="Download"
            data-testid="export-download"
            @click="download"
          >
            <Download :size="14" :stroke-width="1.6" />
            <span>{{ downloadName }}</span>
          </button>
          <button
            type="button"
            :class="[styles.action, styles.primary, copied ? styles.done : '']"
            data-testid="export-copy"
            @click="copy"
          >
            <component :is="copied ? Check : Copy" :size="14" :stroke-width="1.7" />
            <span>{{ copied ? 'Copied' : `Copy ${format.toUpperCase()}` }}</span>
          </button>
        </div>
      </div>

      <pre
        v-if="isCodeFormat(format)"
        :class="styles.code"
        data-testid="export-code"
      ><code>{{ code }}</code></pre>
      <RasterExportPanel v-else :format="rasterFormat" />
    </div>
  </div>
</template>
