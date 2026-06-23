<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { UploadCloud, ChevronDown, Code2, ArrowLeft } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { processSvg } from '@/core/processSvg';
import Button from '@/atoms/Button/Button.vue';
import Modal from '@/atoms/Modal/Modal.vue';
import styles from './ImportDialog.module.css';

// Two-step import (SVG-139): drop/browse/paste loads the markup into a live
// preview with a collapsible, editable code block; Import commits the current
// (possibly edited) markup. The preview re-runs the same validate → processSvg
// pipeline as import, so what you see is what you get.
const emit = defineEmits<{ close: [] }>();
const store = useDocumentStore();

const dragging = ref(false);
const error = ref('');
// staged === true once markup is loaded (file/paste/edit) — shows preview + code.
const staged = ref(false);
const source = ref('');
const fileName = ref('untitled.svg');
const codeOpen = ref(false);
const previewHost = ref<HTMLElement>();

const canImport = computed(() => source.value.trim() !== '' && error.value === '');

// Render the sanitized markup into the preview, stripped to fit like the canvas.
// Sets an inline error (and clears the preview) when the markup can't be parsed.
function refreshPreview(): void {
  const host = previewHost.value;
  if (!host) return;
  if (source.value.trim() === '') {
    host.innerHTML = '';
    error.value = '';
    return;
  }
  try {
    const { svgMarkup } = processSvg(source.value);
    error.value = '';
    host.innerHTML = svgMarkup;
    const svg = host.querySelector('svg');
    if (svg !== null) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      Object.assign(svg.style, { width: '100%', height: '100%', maxHeight: '100%' });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'That SVG could not be parsed.';
    host.innerHTML = '';
  }
}

watch([source, staged], () => nextTick(refreshPreview));

function stage(text: string, name: string, openCode: boolean): void {
  source.value = text;
  fileName.value = name;
  codeOpen.value = openCode;
  staged.value = true;
}

function readFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => stage(String(reader.result), file.name, false);
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

function startEditing(): void {
  stage('', 'untitled.svg', true);
}

function back(): void {
  staged.value = false;
  source.value = '';
  error.value = '';
  codeOpen.value = false;
}

function confirmImport(): void {
  if (!canImport.value) return;
  try {
    store.importSvg(source.value, fileName.value);
    emit('close');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not import that markup.';
  }
}

function loadSample(): void {
  store.loadSample();
  emit('close');
}
</script>

<template>
  <Modal
    :class="styles.shell"
    title="Import an SVG"
    dialog-testid="import-dialog"
    @close="emit('close')"
  >
    <template v-if="!staged">
      <p :class="styles.lead">
        Drop a file or browse. Each shape becomes an animatable layer — groups stay nested.
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

      <div :class="styles.choices">
        <Button
          variant="ghost"
          block
          :class="styles.sample"
          data-testid="load-sample"
          @click="loadSample"
        >
          <span :class="styles.sampleDiamond" />
          Load the sample animation
        </Button>
        <Button
          variant="ghost"
          block
          :class="styles.sample"
          data-testid="import-edit"
          @click="startEditing"
        >
          <Code2 :size="15" :stroke-width="1.6" />
          Paste or write SVG markup
        </Button>
      </div>
    </template>

    <template v-else>
      <div :class="styles.preview" data-testid="import-preview">
        <div v-show="canImport" ref="previewHost" :class="styles.previewSvg" />
        <p v-if="!canImport" :class="styles.previewEmpty">
          {{ error || 'Paste or edit SVG markup below to preview it.' }}
        </p>
      </div>

      <p v-if="error" :class="styles.error" data-testid="import-error">{{ error }}</p>

      <button
        type="button"
        :class="styles.codeToggle"
        :aria-expanded="codeOpen"
        data-testid="import-code-toggle"
        @click="codeOpen = !codeOpen"
      >
        <ChevronDown
          :size="13"
          :stroke-width="1.7"
          :class="[styles.chev, codeOpen ? styles.open : '']"
        />
        Edit code
      </button>
      <textarea
        v-if="codeOpen"
        v-model="source"
        :class="styles.code"
        data-testid="import-code"
        spellcheck="false"
        wrap="off"
        aria-label="SVG markup"
      ></textarea>

      <div :class="styles.actions">
        <Button variant="ghost" :class="styles.action" data-testid="import-back" @click="back">
          <ArrowLeft :size="14" :stroke-width="1.6" />
          Choose another
        </Button>
        <Button
          variant="ghost"
          accent
          :class="styles.action"
          :disabled="!canImport"
          data-testid="import-confirm"
          @click="confirmImport"
        >
          Import
        </Button>
      </div>
    </template>
  </Modal>
</template>
