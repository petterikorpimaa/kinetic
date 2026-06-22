<script setup lang="ts">
import { ref } from 'vue';
import { UploadCloud, X } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { SAMPLE_SVG, SAMPLE_FILE_NAME } from '@/core/sample';

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
  <div class="overlay" @click="emit('close')">
    <div class="dialog" data-testid="import-dialog" @click.stop>
      <div class="dialog__head">
        <h2 class="dialog__title">Import an SVG</h2>
        <button type="button" class="dialog__close" title="Close" @click="emit('close')">
          <X :size="15" :stroke-width="1.6" />
        </button>
      </div>
      <p class="dialog__lead">
        Drop a file or browse. Each top-level shape becomes an animatable layer — start keying
        immediately.
      </p>

      <label
        class="drop"
        :class="{ 'drop--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop="onDrop"
      >
        <span class="drop__icon"><UploadCloud :size="22" :stroke-width="1.6" /></span>
        <span class="drop__text">
          <span class="drop__title">Drop SVG here or <span class="drop__link">browse</span></span>
          <span class="drop__hint">.svg files only</span>
        </span>
        <input type="file" accept=".svg,image/svg+xml" class="drop__input" @change="onFile" />
      </label>

      <p v-if="error" class="dialog__error" data-testid="import-error">{{ error }}</p>

      <div class="dialog__or">
        <span class="dialog__or-line" /><span>or</span><span class="dialog__or-line" />
      </div>

      <button type="button" class="dialog__sample" data-testid="load-sample" @click="loadSample">
        <span class="dialog__sample-diamond" />
        Load the sample animation
      </button>
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
  width: 520px;
  max-width: 92vw;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 26px;
  box-shadow: 0 30px 80px -20px #000;
}

.dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.dialog__title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.dialog__close {
  width: 30px;
  height: 30px;
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

.dialog__lead {
  margin: 0 0 18px;
  color: var(--dim);
  font-size: 13px;
  line-height: 1.5;
}

.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 188px;
  border: 2px dashed var(--line);
  border-radius: 14px;
  background: var(--track);
  cursor: pointer;
  transition: border-color 0.15s;
}

.drop--active {
  border-color: var(--acc);
}

.drop__icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--elev);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--acc);
}

.drop__text {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.drop__title {
  font-weight: 700;
  font-size: 14px;
}

.drop__link {
  color: var(--acc2);
}

.drop__hint {
  font-size: 11px;
  color: var(--dim2);
}

.drop__input {
  display: none;
}

.dialog__error {
  margin: 12px 0 0;
  color: var(--danger);
  font-size: 12px;
}

.dialog__or {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  font-size: 11px;
  color: var(--dim2);
}

.dialog__or-line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.dialog__sample {
  width: 100%;
  padding: 12px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--txt);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dialog__sample:hover {
  border-color: var(--dim2);
}

.dialog__sample-diamond {
  width: 8px;
  height: 8px;
  background: var(--acc);
  border-radius: 2px;
  transform: rotate(45deg);
}
</style>
