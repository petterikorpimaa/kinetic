<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { useTimelineKeyboard } from '@/composables/useTimelineKeyboard';
import { useHistoryKeyboard } from '@/composables/useHistoryKeyboard';
import { useAutosave } from '@/composables/useAutosave';
import TopBar from '../TopBar/TopBar.vue';
import LayersPanel from '../LayersPanel/LayersPanel.vue';
import CanvasStage from '../CanvasStage/CanvasStage.vue';
import InspectorPanel from '../InspectorPanel/InspectorPanel.vue';
import TimelinePanel from '../TimelinePanel/TimelinePanel.vue';
import ImportDialog from '../ImportDialog/ImportDialog.vue';
import ExportDialog from '../ExportDialog/ExportDialog.vue';
import styles from './EditorLayout.module.css';

const store = useDocumentStore();
const playback = usePlaybackStore();
const layerCount = computed(() => store.document.elements.length);

useTimelineKeyboard();
useHistoryKeyboard();
// Restores the autosaved document (if any) before the sample fallback below.
const { restored } = useAutosave();

const layersOpen = ref(true);
const inspectorOpen = ref(true);
const importOpen = ref(false);
const exportOpen = ref(false);

// Fall back to the sample scene (with its example animation) only when nothing
// was restored from storage, then play by default so the animation is moving as
// soon as the editor opens.
onMounted(() => {
  if (!restored && !store.document.svgMarkup) store.loadSample();
  playback.play(store.document.duration);
});

function onImport(): void {
  importOpen.value = true;
}
function onExport(): void {
  exportOpen.value = true;
}
</script>

<template>
  <div :class="styles.editor" data-testid="editor-layout">
    <TopBar @import="onImport" @export="onExport" />

    <div :class="styles.middle">
      <LayersPanel v-if="layersOpen" @collapse="layersOpen = false" />
      <button
        v-else
        type="button"
        :class="[styles.rail, styles.left]"
        title="Expand layers"
        data-testid="layers-rail"
        @click="layersOpen = true"
      >
        <span :class="styles.box"><ChevronRight :size="13" :stroke-width="1.4" /></span>
        <span :class="styles.label">Layers · {{ layerCount }}</span>
      </button>

      <CanvasStage @import="onImport" />

      <InspectorPanel v-if="inspectorOpen" @collapse="inspectorOpen = false" />
      <button
        v-else
        type="button"
        :class="[styles.rail, styles.right]"
        title="Expand inspector"
        data-testid="inspector-rail"
        @click="inspectorOpen = true"
      >
        <span :class="styles.box"><ChevronLeft :size="13" :stroke-width="1.4" /></span>
        <span :class="styles.label">Inspector</span>
      </button>
    </div>

    <TimelinePanel />

    <ImportDialog v-if="importOpen" @close="importOpen = false" />
    <ExportDialog v-if="exportOpen" @close="exportOpen = false" />
  </div>
</template>
