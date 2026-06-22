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
  <aside class="layers" data-testid="layers-panel">
    <div class="layers__head">
      <div class="layers__heading">
        <div class="layers__title-row">
          <span class="layers__title">Layers</span>
          <span class="layers__count">{{ layerCount }}</span>
        </div>
        <div class="layers__file">
          <File :size="11" :stroke-width="1.1" class="layers__file-icon" />
          <span :title="fileName" class="layers__file-name">{{ fileName }}</span>
        </div>
      </div>
      <button type="button" class="icon-btn" title="Collapse panel" @click="$emit('collapse')">
        <ChevronLeft :size="13" :stroke-width="1.4" />
      </button>
    </div>

    <div class="layers__body" @pointerdown.self="store.selectElement(null)">
      <div
        v-for="el in elements"
        :key="el.id"
        class="layer"
        :class="{
          'layer--active': el.id === selectedId,
          'layer--hidden': store.isElementHidden(el.id),
        }"
      >
        <button type="button" class="layer__select" @click="store.selectElement(el.id)">
          <span class="layer__icon"
            ><component :is="iconFor(el.tag)" :size="13" :stroke-width="1.6"
          /></span>
          <span class="layer__name">{{ el.label }}</span>
        </button>
        <span
          v-if="hasKeyframes(el.id)"
          class="layer__dot"
          :data-testid="`layer-dot-${el.id}`"
          title="Has keyframes"
        />
        <button
          type="button"
          class="layer__eye"
          :data-testid="`layer-vis-${el.id}`"
          :title="store.isElementHidden(el.id) ? 'Show layer' : 'Hide layer'"
          @click.stop="store.toggleElementVisibility(el.id)"
        >
          <component
            :is="store.isElementHidden(el.id) ? EyeOff : Eye"
            :size="13"
            :stroke-width="1.6"
          />
        </button>
      </div>
    </div>

    <div class="layers__foot">
      Top-level SVG shapes become animatable layers. Click a shape on the canvas to select it.
    </div>
  </aside>
</template>

<style scoped>
.layers {
  width: var(--layers-width);
  flex: none;
  border-right: 1px solid var(--line);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.layers__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 10px 9px 14px;
  flex: none;
  border-bottom: 1px solid var(--line);
}

.layers__heading {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layers__title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.layers__title {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim);
  font-weight: 700;
}

.layers__count {
  color: var(--dim2);
  font-family: var(--font-mono);
  font-size: 11px;
}

.layers__file {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.layers__file-icon {
  flex: none;
  color: var(--dim2);
}

.layers__file-name {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  color: var(--txt);
}

.layers__body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.layer {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 0 6px 0 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: none;
  color: var(--txt);
}

.layer:hover {
  background: #ffffff08;
}

.layer--active {
  background: #14b8a61f;
  border-color: var(--acc);
}

.layer--hidden {
  opacity: 0.45;
}

.layer__select {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 7px 0;
  border: none;
  background: none;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.layer__dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--acc2);
  box-shadow: 0 0 6px -1px var(--acc);
}

.layer__eye {
  width: 24px;
  height: 24px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--dim2);
  cursor: pointer;
}

.layer__eye:hover {
  color: var(--txt);
  background: #ffffff0d;
}

.layer__icon {
  width: 20px;
  height: 20px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dim);
  border-radius: 5px;
  background: #ffffff09;
}

.layer--active .layer__icon {
  color: var(--acc2);
}

.layer__name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layers__foot {
  flex: none;
  padding: 11px 14px;
  border-top: 1px solid var(--line);
  font-size: 11px;
  color: var(--dim2);
  line-height: 1.5;
}
</style>
