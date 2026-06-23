<script setup lang="ts">
import { computed } from 'vue';
import {
  File,
  ChevronLeft,
  Circle,
  Square,
  Spline,
  Minus,
  Boxes,
  Type,
  Image,
  Shapes,
  Eye,
  EyeOff,
} from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import Button from '@/atoms/Button/Button.vue';
import SectionLabel from '@/atoms/SectionLabel/SectionLabel.vue';
import styles from './LayersPanel.module.css';

// Layer list: select + per-element visibility toggle (M1, Epic 5).
defineEmits<{ collapse: [] }>();

const TAG_ICON: Record<string, typeof Circle> = {
  circle: Circle,
  ellipse: Circle,
  rect: Square,
  path: Spline,
  line: Minus,
  polyline: Spline,
  polygon: Spline,
  g: Boxes,
  text: Type,
  image: Image,
};

const store = useDocumentStore();
const elements = computed(() => store.document.elements);
const selectedId = computed(() => store.document.selectedElementId);
const layerCount = computed(() => elements.value.length);
const fileName = computed(() => (layerCount.value > 0 ? store.document.name : 'No file imported'));

function iconFor(tag: string): typeof Circle {
  return TAG_ICON[tag] ?? Shapes;
}

// A dot marks layers that carry animation (any track with at least one keyframe).
function hasKeyframes(id: string): boolean {
  return store.tracksForElement(id).some((track) => track.keyframes.length > 0);
}
</script>

<template>
  <aside :class="styles.layers" data-testid="layers-panel">
    <div :class="styles.head">
      <div :class="styles.heading">
        <div :class="styles.titleRow">
          <SectionLabel :class="styles.title">Layers</SectionLabel>
          <span :class="styles.count">{{ layerCount }}</span>
        </div>
        <div :class="styles.file">
          <File :size="11" :stroke-width="1.1" :class="styles.fileIcon" />
          <span :title="fileName" :class="styles.fileLabel">{{ fileName }}</span>
        </div>
      </div>
      <Button variant="icon" size="sm" title="Collapse panel" @click="$emit('collapse')">
        <ChevronLeft :size="13" :stroke-width="1.4" />
      </Button>
    </div>

    <div :class="styles.body" @pointerdown.self="store.selectElement(null)">
      <div
        v-for="el in elements"
        :key="el.id"
        :class="[
          styles.layer,
          el.id === selectedId ? styles.active : '',
          store.isElementHidden(el.id) ? styles.hidden : '',
        ]"
      >
        <button type="button" :class="styles.select" @click="store.selectElement(el.id)">
          <span :class="styles.icon"
            ><component :is="iconFor(el.tag)" :size="13" :stroke-width="1.6"
          /></span>
          <span :class="styles.name">{{ el.label }}</span>
        </button>
        <span
          v-if="hasKeyframes(el.id)"
          :class="styles.dot"
          :data-testid="`layer-dot-${el.id}`"
          title="Has keyframes"
        />
        <Button
          variant="icon"
          plain
          size="sm"
          :class="styles.eye"
          :data-testid="`layer-vis-${el.id}`"
          :title="store.isElementHidden(el.id) ? 'Show layer' : 'Hide layer'"
          @click.stop="store.toggleElementVisibility(el.id)"
        >
          <component
            :is="store.isElementHidden(el.id) ? EyeOff : Eye"
            :size="13"
            :stroke-width="1.6"
          />
        </Button>
      </div>
    </div>

    <div :class="styles.foot">
      Top-level SVG shapes become animatable layers. Click a shape on the canvas to select it.
    </div>
  </aside>
</template>
