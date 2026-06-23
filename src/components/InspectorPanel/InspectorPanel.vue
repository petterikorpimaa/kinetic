<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ChevronLeft, ChevronDown, MousePointer2, Plus } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { PROPERTY_DEFS, DROP_SHADOW_MEMBERS, DROP_SHADOW_LABEL } from '@/core/properties';
import PropertyRow from '../PropertyRow/PropertyRow.vue';
import AddPropertyMenu from '../AddPropertyMenu/AddPropertyMenu.vue';
import EasingEditor from '../EasingEditor/EasingEditor.vue';
import Button from '@/atoms/Button/Button.vue';
import SectionLabel from '@/atoms/SectionLabel/SectionLabel.vue';
import EmptyState from '@/atoms/EmptyState/EmptyState.vue';
import styles from './InspectorPanel.module.css';

// Inspector (M2, Epic 6): active property rows for the selected element, value
// editing at the playhead, add/remove property, and an active-property count.
defineEmits<{ collapse: [] }>();

const store = useDocumentStore();
const playback = usePlaybackStore();

const selectedId = computed(() => store.document.selectedElementId);
const selected = computed(() =>
  store.document.elements.find((element) => element.id === selectedId.value),
);
const selName = computed(() => selected.value?.label ?? '—');
const timeText = computed(() => `${playback.currentTime.toFixed(2)}s`);
const multiSelectLocked = computed(() => store.selectedKeyframeIds.size > 1);

const activeRows = computed(() => {
  const id = selectedId.value;
  if (id === null) return [];
  const tracks = store.tracksForElement(id);
  return PROPERTY_DEFS.filter((def) => tracks.some((track) => track.property === def.key)).map(
    (def) => ({ def, track: tracks.find((track) => track.property === def.key) }),
  );
});
const activeKeys = computed(() => activeRows.value.map((row) => row.def.key));
const activeCount = computed(() => activeRows.value.length);

// Drop-shadow's tracks (X/Y/colour) are grouped under one expandable row (SVG-59).
const SHADOW_MEMBERS: readonly string[] = DROP_SHADOW_MEMBERS;
const normalRows = computed(() =>
  activeRows.value.filter((row) => !SHADOW_MEMBERS.includes(row.def.key)),
);
const shadowRows = computed(() =>
  activeRows.value.filter((row) => SHADOW_MEMBERS.includes(row.def.key)),
);
const shadowOpen = ref(true);

function removeDropShadow(): void {
  if (selected.value === undefined) return;
  for (const row of shadowRows.value) store.removeProperty(selected.value.id, row.def.key);
}

const addOpen = ref(false);
watch(selectedId, () => {
  addOpen.value = false;
});
</script>

<template>
  <aside :class="styles.inspector" data-testid="inspector-panel">
    <div :class="styles.head">
      <div :class="styles.heading">
        <SectionLabel :class="styles.eyebrow">Inspector</SectionLabel>
        <div :class="styles.name" :title="selName">{{ selName }}</div>
        <div :class="styles.meta">
          Values at playhead ·
          <span :class="styles.time" data-testid="inspector-time">{{ timeText }}</span>
        </div>
        <div v-if="multiSelectLocked" :class="styles.lock" data-testid="inspector-lock">
          Editing locked — multiple keyframes selected
        </div>
      </div>
      <Button variant="icon" size="sm" title="Collapse panel" @click="$emit('collapse')">
        <ChevronLeft :size="13" :stroke-width="1.4" />
      </Button>
    </div>

    <template v-if="selected">
      <div :class="styles.props">
        <div :class="styles.section">
          <SectionLabel>Properties</SectionLabel>
          <span :class="styles.count" data-testid="inspector-count">{{ activeCount }}</span>
        </div>

        <PropertyRow
          v-for="row in normalRows"
          :key="row.def.key"
          :element-id="selected.id"
          :def="row.def"
          :track="row.track"
          :time="playback.currentTime"
        />

        <div v-if="shadowRows.length > 0" :class="styles.shadow" data-testid="dropshadow-group">
          <div :class="styles.shadowHead">
            <button type="button" :class="styles.shadowToggle" @click="shadowOpen = !shadowOpen">
              <ChevronDown
                :size="12"
                :stroke-width="1.7"
                :class="[styles.shadowChev, shadowOpen ? styles.open : '']"
              />
              {{ DROP_SHADOW_LABEL }}
            </button>
            <Button
              variant="icon"
              plain
              danger
              :class="styles.shadowRemove"
              data-testid="dropshadow-remove"
              title="Remove drop shadow"
              @click="removeDropShadow"
            >
              ×
            </Button>
          </div>
          <PropertyRow
            v-for="row in shadowRows"
            v-show="shadowOpen"
            :key="row.def.key"
            :element-id="selected.id"
            :def="row.def"
            :track="row.track"
            :time="playback.currentTime"
          />
        </div>

        <EmptyState v-if="activeCount === 0" bordered :class="styles.note">
          No animated properties yet — add one to start keyframing.
        </EmptyState>

        <div :class="styles.addWrap">
          <Button
            variant="dashed"
            block
            :class="styles.add"
            data-testid="add-property"
            @click="addOpen = !addOpen"
          >
            <Plus :size="15" :stroke-width="1.8" />
            Add property
          </Button>
          <AddPropertyMenu
            v-if="addOpen"
            :element-id="selected.id"
            :active-keys="activeKeys"
            @close="addOpen = false"
          />
        </div>
      </div>

      <EasingEditor />
    </template>

    <EmptyState v-else :class="styles.empty">
      <template #icon>
        <div :class="styles.emptyIcon">
          <MousePointer2 :size="22" :stroke-width="1.6" />
        </div>
      </template>
      <div :class="styles.emptyTitle">No shape selected</div>
      <div :class="styles.emptyHint">
        Click a shape on the canvas, or pick a layer, to edit and animate its properties.
      </div>
    </EmptyState>
  </aside>
</template>
