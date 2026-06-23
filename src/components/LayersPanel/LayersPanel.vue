<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  File,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
import { layerRows, descendantIds, type LayerRow } from '@/core/layerTree';
import { canContainChildren, dropPositionForRow, type DropPosition } from '@/core/reorderLayers';
import Button from '@/atoms/Button/Button.vue';
import SectionLabel from '@/atoms/SectionLabel/SectionLabel.vue';
import styles from './LayersPanel.module.css';

// Layer tree: indented rows with collapsible groups, select + per-element
// visibility (M1, Epic 5; nesting SVG-137). The hierarchy is derived from each
// element's parentId; collapse state is transient view state, reset on load.
defineEmits<{ collapse: [] }>();

const INDENT_STEP_PX = 14;
const BASE_INDENT_PX = 8;
const DRAG_THRESHOLD_PX = 4;

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

// Which groups are collapsed in the panel. Not part of the document — cleared
// whenever a new document is loaded (loadDocument assigns a fresh id).
const collapsed = ref<ReadonlySet<string>>(new Set());
watch(
  () => store.document.id,
  () => {
    collapsed.value = new Set();
  },
);

const rows = computed(() => layerRows(elements.value, (id) => collapsed.value.has(id)));

function isCollapsed(id: string): boolean {
  return collapsed.value.has(id);
}

function toggleCollapse(id: string): void {
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
}

function iconFor(tag: string): typeof Circle {
  return TAG_ICON[tag] ?? Shapes;
}

function indentFor(depth: number): string {
  return `${BASE_INDENT_PX + depth * INDENT_STEP_PX}px`;
}

function ownsKeyframes(id: string): boolean {
  return store.tracksForElement(id).some((track) => track.keyframes.length > 0);
}

// A dot marks layers that carry animation; a group rolls up its descendants'.
function rowHasDot(row: LayerRow): boolean {
  if (ownsKeyframes(row.element.id)) return true;
  if (!row.hasChildren) return false;
  return descendantIds(elements.value, row.element.id).some(ownsKeyframes);
}

// --- Drag to reorder / re-nest (SVG-157) -----------------------------------
// Pointer-based: the grabbed row's label follows the pointer (ghost), a live
// indicator shows where it will land, and release commits via the store.
const dragId = ref<string | null>(null);
const dropTarget = ref<{ id: string; position: DropPosition } | null>(null);
const pointer = ref<{ x: number; y: number } | null>(null);
const dragLabel = ref('');
// A real drag swallows the trailing click so it doesn't also select.
let suppressClick = false;

function onGrab(row: LayerRow, event: PointerEvent): void {
  if (event.button !== 0) return;
  suppressClick = false;
  const startX = event.clientX;
  const startY = event.clientY;
  const id = row.element.id;
  let active = false;

  function move(moveEvent: PointerEvent): void {
    if (!active) {
      const moved = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (moved < DRAG_THRESHOLD_PX) return;
      active = true;
      dragId.value = id;
      dragLabel.value = row.element.label;
      document.body.style.userSelect = 'none';
    }
    pointer.value = { x: moveEvent.clientX, y: moveEvent.clientY };
    updateDrop(moveEvent);
  }

  function up(): void {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    document.body.style.userSelect = '';
    if (active) {
      suppressClick = true;
      if (dropTarget.value !== null) {
        store.moveElement(id, dropTarget.value.id, dropTarget.value.position);
      }
    }
    dragId.value = null;
    dropTarget.value = null;
    pointer.value = null;
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// Resolve the row under the pointer and where the drop would land. A target that
// is the dragged node or one of its descendants is rejected (no self-nesting).
function updateDrop(event: PointerEvent): void {
  const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-layer-id]');
  const targetId = hit?.getAttribute('data-layer-id') ?? null;
  if (targetId === null || targetId === dragId.value) {
    dropTarget.value = null;
    return;
  }
  if (dragId.value !== null && descendantIds(elements.value, dragId.value).includes(targetId)) {
    dropTarget.value = null;
    return;
  }
  const targetRow = rows.value.find((row) => row.element.id === targetId);
  if (targetRow === undefined) {
    dropTarget.value = null;
    return;
  }
  const rect = (hit as HTMLElement).getBoundingClientRect();
  dropTarget.value = {
    id: targetId,
    position: dropPositionForRow(
      rect.top,
      rect.height,
      event.clientY,
      canContainChildren(targetRow.element.tag),
    ),
  };
}

function onSelect(row: LayerRow): void {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  store.selectElement(row.element.id);
}

function dropClass(row: LayerRow): string {
  if (dropTarget.value?.id !== row.element.id) return '';
  if (dropTarget.value.position === 'before') return styles.dropBefore ?? '';
  if (dropTarget.value.position === 'after') return styles.dropAfter ?? '';
  return styles.dropInside ?? '';
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
      <Button
        variant="icon"
        size="sm"
        :class="styles.collapse"
        title="Collapse panel"
        @click="$emit('collapse')"
      >
        <ChevronLeft :size="13" :stroke-width="1.4" />
      </Button>
    </div>

    <div :class="styles.body" @pointerdown.self="store.selectElement(null)">
      <div
        v-for="row in rows"
        :key="row.element.id"
        :class="[
          styles.layer,
          row.element.id === selectedId ? styles.active : '',
          store.isElementHidden(row.element.id) ? styles.hidden : '',
          row.element.id === dragId ? styles.dragging : '',
          dropClass(row),
        ]"
        :style="{ paddingLeft: indentFor(row.depth) }"
        :data-layer-id="row.element.id"
        :data-testid="`layer-row-${row.element.id}`"
      >
        <button
          v-if="row.hasChildren"
          type="button"
          :class="styles.disclosure"
          :data-testid="`layer-disclosure-${row.element.id}`"
          :aria-expanded="!isCollapsed(row.element.id)"
          :title="isCollapsed(row.element.id) ? 'Expand group' : 'Collapse group'"
          @click.stop="toggleCollapse(row.element.id)"
        >
          <component
            :is="isCollapsed(row.element.id) ? ChevronRight : ChevronDown"
            :size="13"
            :stroke-width="1.7"
          />
        </button>
        <span v-else :class="styles.disclosureSpacer" />

        <button
          type="button"
          :class="styles.select"
          @pointerdown="onGrab(row, $event)"
          @click="onSelect(row)"
        >
          <span :class="styles.icon"
            ><component :is="iconFor(row.element.tag)" :size="13" :stroke-width="1.6"
          /></span>
          <span :class="styles.name">{{ row.element.label }}</span>
        </button>
        <span
          v-if="rowHasDot(row)"
          :class="styles.dot"
          :data-testid="`layer-dot-${row.element.id}`"
          title="Has keyframes"
        />
        <Button
          variant="icon"
          plain
          size="sm"
          :class="styles.eye"
          :data-testid="`layer-vis-${row.element.id}`"
          :title="store.isElementHidden(row.element.id) ? 'Show layer' : 'Hide layer'"
          @click.stop="store.toggleElementVisibility(row.element.id)"
        >
          <component
            :is="store.isElementHidden(row.element.id) ? EyeOff : Eye"
            :size="13"
            :stroke-width="1.6"
          />
        </Button>
      </div>
    </div>

    <div :class="styles.foot">
      SVG shapes become animatable layers. Expand a group to select and animate any child. Drag a
      layer to reorder it, or onto a group to nest it.
    </div>

    <div
      v-if="dragId !== null && pointer !== null"
      :class="styles.ghost"
      :style="{ top: `${pointer.y}px`, left: `${pointer.x}px` }"
      data-testid="layer-drag-ghost"
    >
      {{ dragLabel }}
    </div>
  </aside>
</template>
