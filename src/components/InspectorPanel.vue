<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ChevronLeft, ChevronDown, MousePointer2, Plus } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePlaybackStore } from '@/stores/playback';
import { PROPERTY_DEFS, DROP_SHADOW_MEMBERS, DROP_SHADOW_LABEL } from '@/core/properties';
import PropertyRow from './PropertyRow.vue';
import AddPropertyMenu from './AddPropertyMenu.vue';
import EasingEditor from './EasingEditor.vue';

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
  <aside class="inspector" data-testid="inspector-panel">
    <div class="inspector__head">
      <div class="inspector__heading">
        <div class="inspector__eyebrow">Inspector</div>
        <div class="inspector__name" :title="selName">{{ selName }}</div>
        <div class="inspector__meta">
          Values at playhead ·
          <span class="inspector__time" data-testid="inspector-time">{{ timeText }}</span>
        </div>
        <div v-if="multiSelectLocked" class="inspector__lock" data-testid="inspector-lock">
          Editing locked — multiple keyframes selected
        </div>
      </div>
      <button type="button" class="icon-btn" title="Collapse panel" @click="$emit('collapse')">
        <ChevronLeft :size="13" :stroke-width="1.4" />
      </button>
    </div>

    <template v-if="selected">
      <div class="inspector__props">
        <div class="inspector__section">
          <span class="inspector__section-title">Properties</span>
          <span class="inspector__count" data-testid="inspector-count">{{ activeCount }}</span>
        </div>

        <PropertyRow
          v-for="row in normalRows"
          :key="row.def.key"
          :element-id="selected.id"
          :def="row.def"
          :track="row.track"
          :time="playback.currentTime"
        />

        <div v-if="shadowRows.length > 0" class="dropshadow" data-testid="dropshadow-group">
          <div class="dropshadow__head">
            <button type="button" class="dropshadow__toggle" @click="shadowOpen = !shadowOpen">
              <ChevronDown
                :size="12"
                :stroke-width="1.7"
                class="dropshadow__chev"
                :class="{ 'dropshadow__chev--open': shadowOpen }"
              />
              {{ DROP_SHADOW_LABEL }}
            </button>
            <button
              type="button"
              class="dropshadow__remove"
              data-testid="dropshadow-remove"
              title="Remove drop shadow"
              @click="removeDropShadow"
            >
              ×
            </button>
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

        <p v-if="activeCount === 0" class="inspector__note">
          No animated properties yet — add one to start keyframing.
        </p>

        <div class="inspector__add-wrap">
          <button
            type="button"
            class="inspector__add"
            data-testid="add-property"
            @click="addOpen = !addOpen"
          >
            <Plus :size="15" :stroke-width="1.8" />
            Add property
          </button>
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

    <div v-else class="inspector__empty">
      <div class="inspector__empty-icon">
        <MousePointer2 :size="22" :stroke-width="1.6" />
      </div>
      <div class="inspector__empty-title">No shape selected</div>
      <div class="inspector__empty-hint">
        Click a shape on the canvas, or pick a layer, to edit and animate its properties.
      </div>
    </div>
  </aside>
</template>

<style scoped>
.inspector {
  width: var(--inspector-width);
  flex: none;
  border-left: 1px solid var(--line);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.inspector__head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.inspector__heading {
  flex: 1;
  min-width: 0;
}

.inspector__eyebrow {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim);
  font-weight: 700;
  margin-bottom: 5px;
}

.inspector__name {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector__meta {
  font-size: 11px;
  color: var(--dim2);
  margin-top: 2px;
}

.inspector__time {
  color: var(--acc2);
  font-family: var(--font-mono);
}

.inspector__lock {
  margin-top: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--danger);
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

.inspector__props {
  padding: 12px 14px 16px;
  flex: none;
}

.inspector__section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2px 2px 10px;
}

.inspector__section-title {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim2);
  font-weight: 700;
}

.inspector__count {
  font-size: 10px;
  color: var(--dim2);
  font-family: var(--font-mono);
}

.inspector__note {
  margin: 0 0 10px;
  padding: 14px;
  text-align: center;
  border: 1px dashed var(--line);
  border-radius: 11px;
  color: var(--dim2);
  font-size: 12px;
  line-height: 1.5;
}

.dropshadow {
  margin-bottom: 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 6px 8px 2px;
}

.dropshadow__head {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.dropshadow__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 2px;
  border: none;
  background: none;
  color: var(--dim);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.dropshadow__chev {
  transition: transform 0.15s;
}

.dropshadow__chev--open {
  transform: rotate(180deg);
}

.dropshadow__remove {
  width: 22px;
  height: 22px;
  flex: none;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--dim2);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.dropshadow__remove:hover {
  color: var(--danger);
  background: #ffffff14;
}

.inspector__add-wrap {
  position: relative;
  margin-top: 4px;
}

.inspector__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 9px;
  border-radius: 9px;
  border: 1px dashed var(--line);
  background: none;
  color: var(--dim);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.inspector__add:hover {
  color: var(--txt);
  border-color: var(--dim2);
}

.inspector__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 24px;
  text-align: center;
  color: var(--dim2);
}

.inspector__empty-icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  border: 1px solid var(--line);
  background: var(--elev);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dim);
}

.inspector__empty-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dim);
}

.inspector__empty-hint {
  font-size: 12px;
  line-height: 1.5;
  max-width: 220px;
}
</style>
