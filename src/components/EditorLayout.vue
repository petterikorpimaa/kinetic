<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { useTimelineKeyboard } from '@/composables/useTimelineKeyboard';
import { useHistoryKeyboard } from '@/composables/useHistoryKeyboard';
import { useAutosave } from '@/composables/useAutosave';
import { SAMPLE_SVG, SAMPLE_FILE_NAME } from '@/core/sample';
import TopBar from './TopBar.vue';
import LayersPanel from './LayersPanel.vue';
import CanvasStage from './CanvasStage.vue';
import InspectorPanel from './InspectorPanel.vue';
import TimelinePanel from './TimelinePanel.vue';
import ImportDialog from './ImportDialog.vue';
import ExportDialog from './ExportDialog.vue';

const store = useDocumentStore();
const layerCount = computed(() => store.document.elements.length);

useTimelineKeyboard();
useHistoryKeyboard();
// Restores the autosaved document (if any) before the sample fallback below.
const { restored } = useAutosave();

const layersOpen = ref(true);
const inspectorOpen = ref(true);
const importOpen = ref(false);
const exportOpen = ref(false);

// Fall back to the sample scene only when nothing was restored from storage.
onMounted(() => {
  if (!restored && !store.document.svgMarkup) store.importSvg(SAMPLE_SVG, SAMPLE_FILE_NAME);
});

function onImport(): void {
  importOpen.value = true;
}
function onExport(): void {
  exportOpen.value = true;
}
</script>

<template>
  <div class="editor" data-testid="editor-layout">
    <TopBar @import="onImport" @export="onExport" />

    <div class="editor__middle">
      <LayersPanel v-if="layersOpen" @collapse="layersOpen = false" />
      <button
        v-else
        type="button"
        class="rail rail--left"
        title="Expand layers"
        data-testid="layers-rail"
        @click="layersOpen = true"
      >
        <span class="rail__box"><ChevronRight :size="13" :stroke-width="1.4" /></span>
        <span class="rail__label">Layers · {{ layerCount }}</span>
      </button>

      <CanvasStage />

      <InspectorPanel v-if="inspectorOpen" @collapse="inspectorOpen = false" />
      <button
        v-else
        type="button"
        class="rail rail--right"
        title="Expand inspector"
        data-testid="inspector-rail"
        @click="inspectorOpen = true"
      >
        <span class="rail__box"><ChevronLeft :size="13" :stroke-width="1.4" /></span>
        <span class="rail__label">Inspector</span>
      </button>
    </div>

    <TimelinePanel />

    <ImportDialog v-if="importOpen" @close="importOpen = false" />
    <ExportDialog v-if="exportOpen" @close="exportOpen = false" />
  </div>
</template>

<style scoped>
.editor {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.editor__middle {
  flex: 1;
  display: flex;
  min-height: 0;
}

.rail {
  width: var(--rail-width);
  flex: none;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  cursor: pointer;
  border: none;
}

.rail--left {
  border-right: 1px solid var(--line);
}

.rail--right {
  border-left: 1px solid var(--line);
}

.rail__box {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--dim);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rail__label {
  writing-mode: vertical-rl;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dim);
  font-weight: 700;
}

.rail:hover .rail__box {
  color: var(--txt);
}
</style>
