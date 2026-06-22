<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { X, Check, Copy, Download } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { exportCss } from '@/core/cssExport';
import { exportGsap } from '@/core/gsapExport';
import RasterExportPanel from './RasterExportPanel.vue';

type CodeFormat = 'css' | 'gsap' | 'svg';
type Format = CodeFormat | 'gif' | 'video';

const emit = defineEmits<{ close: [] }>();
const store = useDocumentStore();

const TABS: readonly { id: Format; label: string }[] = [
  { id: 'css', label: 'CSS' },
  { id: 'gsap', label: 'GSAP' },
  { id: 'svg', label: 'SVG' },
  { id: 'gif', label: 'GIF' },
  { id: 'video', label: 'Video' },
];
const CODE_META: Record<CodeFormat, { ext: string; mime: string }> = {
  css: { ext: 'css', mime: 'text/css' },
  gsap: { ext: 'js', mime: 'text/javascript' },
  svg: { ext: 'svg', mime: 'image/svg+xml' },
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
  <div class="overlay" @click="emit('close')">
    <div class="dialog" data-testid="export-dialog" @click.stop>
      <div class="dialog__head">
        <div>
          <h2 class="dialog__title">Export animation</h2>
          <p class="dialog__lead">
            Clean, pasteable code — sampled from the same engine as the editor.
          </p>
        </div>
        <button type="button" class="dialog__close" title="Close" @click="emit('close')">
          <X :size="15" :stroke-width="1.6" />
        </button>
      </div>

      <div class="bar">
        <div class="tabs" role="tablist">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            type="button"
            role="tab"
            class="tab"
            :class="{ 'tab--active': format === tab.id }"
            :data-testid="`export-tab-${tab.id}`"
            :aria-selected="format === tab.id"
            @click="setFormat(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="isCodeFormat(format)" class="actions">
          <button
            type="button"
            class="action"
            title="Download"
            data-testid="export-download"
            @click="download"
          >
            <Download :size="14" :stroke-width="1.6" />
            <span>{{ downloadName }}</span>
          </button>
          <button
            type="button"
            class="action action--primary"
            :class="{ 'action--done': copied }"
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
        class="code"
        data-testid="export-code"
      ><code>{{ code }}</code></pre>
      <RasterExportPanel v-else :format="rasterFormat" />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: #08080cdd;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.dialog {
  width: 680px;
  max-width: 94vw;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  box-shadow: 0 30px 80px -20px #000;
}

.dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.dialog__title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.dialog__lead {
  margin: 5px 0 0;
  color: var(--dim);
  font-size: 12.5px;
  line-height: 1.5;
}

.dialog__close {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog__close:hover {
  color: var(--txt);
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.tabs {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: var(--track);
  border: 1px solid var(--line);
}

.tab {
  height: 28px;
  padding: 0 14px;
  border-radius: 7px;
  border: none;
  background: none;
  color: var(--dim);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.tab:hover {
  color: var(--txt);
}

.tab--active {
  background: var(--elev);
  color: var(--acc2);
}

.actions {
  display: flex;
  gap: 8px;
}

.action {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--txt);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  max-width: 220px;
}

.action span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action:hover {
  border-color: var(--dim2);
}

.action--primary {
  border-color: var(--acc);
  color: var(--acc2);
}

.action--done {
  color: var(--acc2);
  border-color: var(--acc);
}

.code {
  margin: 0;
  height: 380px;
  max-height: 56vh;
  overflow: auto;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--track);
  color: var(--txt);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre;
  tab-size: 2;
}

.code code {
  font-family: inherit;
}
</style>
