<script setup lang="ts">
import { ref } from 'vue';
import { UploadCloud, X } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { SAMPLE_SVG, SAMPLE_FILE_NAME } from '@/core/sample';
import styles from './ImportDialog.module.css';

const emit = defineEmits<{ close: [] }>();
const store = useDocumentStore();

const dragging = ref(false);
const error = ref('');

function importText(text: string, fileName: string): void {
  try {
    store.importSvg(text, fileName);
    emit('close');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not import that file.';
  }
}

function readFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => importText(String(reader.result), file.name);
  reader.onerror = () => {
    error.value = 'Could not read that file.';
  };
  reader.readAsText(file);
}

function onFile(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) readFile(file);
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  dragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) readFile(file);
}

function loadSample(): void {
  importText(SAMPLE_SVG, SAMPLE_FILE_NAME);
}
</script>

<template>
  <div :class="styles.overlay" @click="emit('close')">
    <div :class="styles.dialog" data-testid="import-dialog" @click.stop>
      <div :class="styles.head">
        <h2 :class="styles.title">Import an SVG</h2>
        <button type="button" :class="styles.close" title="Close" @click="emit('close')">
          <X :size="15" :stroke-width="1.6" />
        </button>
      </div>
      <p :class="styles.lead">
        Drop a file or browse. Each top-level shape becomes an animatable layer — start keying
        immediately.
      </p>

      <label
        :class="[styles.drop, dragging ? styles.active : '']"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop="onDrop"
      >
        <span :class="styles.dropIcon"><UploadCloud :size="22" :stroke-width="1.6" /></span>
        <span :class="styles.dropText">
          <span :class="styles.dropTitle"
            >Drop SVG here or <span :class="styles.dropLink">browse</span></span
          >
          <span :class="styles.dropHint">.svg files only</span>
        </span>
        <input type="file" accept=".svg,image/svg+xml" :class="styles.dropInput" @change="onFile" />
      </label>

      <p v-if="error" :class="styles.error" data-testid="import-error">{{ error }}</p>

      <div :class="styles.or">
        <span :class="styles.orLine" /><span>or</span><span :class="styles.orLine" />
      </div>

      <button type="button" :class="styles.sample" data-testid="load-sample" @click="loadSample">
        <span :class="styles.sampleDiamond" />
        Load the sample animation
      </button>
    </div>
  </div>
</template>
