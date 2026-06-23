<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { Check, Copy, Download } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { exportCss } from '@/core/cssExport';
import { exportGsap } from '@/core/gsapExport';
import RasterExportPanel from '../RasterExportPanel/RasterExportPanel.vue';
import Button from '@/atoms/Button/Button.vue';
import Modal from '@/atoms/Modal/Modal.vue';
import SegmentedControl from '@/atoms/SegmentedControl/SegmentedControl.vue';
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
  <Modal
    :class="styles.shell"
    title="Export animation"
    dialog-testid="export-dialog"
    data-testid="export-overlay"
    @close="emit('close')"
  >
    <template #subtitle>
      <p :class="styles.lead">
        Clean, pasteable code — sampled from the same engine as the editor.
      </p>
    </template>

    <div :class="styles.bar">
      <SegmentedControl
        :model-value="format"
        :items="TABS"
        testid-prefix="export-tab-"
        @update:model-value="setFormat"
      />

      <div v-if="isCodeFormat(format)" :class="styles.actions">
        <Button
          variant="ghost"
          :class="styles.action"
          title="Download"
          data-testid="export-download"
          @click="download"
        >
          <Download :size="14" :stroke-width="1.6" />
          <span>{{ downloadName }}</span>
        </Button>
        <Button
          variant="ghost"
          accent
          :class="styles.action"
          data-testid="export-copy"
          @click="copy"
        >
          <component :is="copied ? Check : Copy" :size="14" :stroke-width="1.7" />
          <span>{{ copied ? 'Copied' : `Copy ${format.toUpperCase()}` }}</span>
        </Button>
      </div>
    </div>

    <pre
      v-if="isCodeFormat(format)"
      :class="styles.code"
      data-testid="export-code"
    ><code>{{ code }}</code></pre>
    <RasterExportPanel v-else :format="rasterFormat" />
  </Modal>
</template>
