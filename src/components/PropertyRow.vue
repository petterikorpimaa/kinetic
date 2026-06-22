<script setup lang="ts">
import { computed } from 'vue';
import type { PropertyDef } from '@/core/properties';
import { formatNumber } from '@/core/properties';
import type { AnyTrack, NumericTrack, ColorTrack } from '@/types/track';
import { sampleNumber, sampleColor, hasKeyframeAt } from '@/core/animation';
import { normalizeHex } from '@/core/color';
import { useDocumentStore } from '@/stores/document';

// One Inspector property row (M2, Epic 6): value control, add-keyframe diamond,
// and remove. Editing writes a keyframe at the playhead via the store.
const props = defineProps<{
  elementId: string;
  def: PropertyDef;
  track: AnyTrack | undefined;
  time: number;
}>();

const store = useDocumentStore();

// Editing a single value at the playhead is ambiguous while several keyframes
// are selected, so the value controls lock until the selection narrows.
const locked = computed(() => store.selectedKeyframeIds.size > 1);

// A track's value kind is fixed by its property, so these reads are sound.
const numericValue = computed(() => {
  if (props.def.kind !== 'number') return 0;
  return sampleNumber(props.track as NumericTrack | undefined, props.time, props.def.defaultValue);
});
const colorValue = computed(() => {
  if (props.def.kind !== 'color') return '#000000';
  return sampleColor(props.track as ColorTrack | undefined, props.time, props.def.defaultValue);
});

const numericText = computed(() =>
  props.def.kind === 'number' ? formatNumber(props.def, numericValue.value) : '',
);
const unit = computed(() => (props.def.kind === 'number' ? props.def.unit : ''));
const isKeyed = computed(
  () => props.track !== undefined && hasKeyframeAt(props.track.keyframes, props.time),
);

function commitNumber(event: Event): void {
  if (locked.value || props.def.kind !== 'number') return;
  const value = Number.parseFloat((event.target as HTMLInputElement).value);
  if (Number.isNaN(value)) return;
  store.setNumberValue(props.elementId, props.def.key, props.time, value);
}

function commitColor(raw: string): void {
  if (locked.value || props.def.kind !== 'color') return;
  const value = normalizeHex(raw);
  if (value === null) return;
  store.setColorValue(props.elementId, props.def.key, props.time, value);
}

function onHexInput(event: Event): void {
  commitColor((event.target as HTMLInputElement).value);
}

function addKeyframe(): void {
  if (props.def.kind === 'color') {
    store.setColorValue(props.elementId, props.def.key, props.time, colorValue.value);
  } else {
    store.setNumberValue(props.elementId, props.def.key, props.time, numericValue.value);
  }
}

function remove(): void {
  store.removeProperty(props.elementId, props.def.key);
}

function selectAll(event: FocusEvent): void {
  (event.target as HTMLInputElement).select();
}
</script>

<template>
  <div class="prop" :data-testid="`prop-row-${def.key}`">
    <span class="prop__label">{{ def.label }}</span>

    <div class="prop__control">
      <template v-if="def.kind === 'color'">
        <label
          class="prop__swatch"
          :class="{ 'prop__swatch--locked': locked }"
          :style="{ background: colorValue }"
          title="Pick colour"
        >
          <input
            type="color"
            :value="colorValue"
            class="prop__color-input"
            :disabled="locked"
            @input="onHexInput"
          />
        </label>
        <input
          type="text"
          class="prop__input prop__input--hex"
          :class="{ 'prop__input--locked': locked }"
          :value="colorValue"
          :disabled="locked"
          @change="onHexInput"
          @focus="selectAll"
        />
      </template>
      <template v-else>
        <input
          type="text"
          class="prop__input"
          :class="{ 'prop__input--locked': locked }"
          :value="numericText"
          :disabled="locked"
          @change="commitNumber"
          @focus="selectAll"
        />
        <span v-if="unit" class="prop__unit">{{ unit }}</span>
      </template>
    </div>

    <button
      type="button"
      class="prop__key"
      :class="{ 'prop__key--active': isKeyed }"
      :data-testid="`prop-key-${def.key}`"
      title="Add keyframe at playhead"
      @click="addKeyframe"
    >
      <span class="prop__diamond">◆</span>
    </button>
    <button
      type="button"
      class="prop__remove"
      :data-testid="`prop-remove-${def.key}`"
      title="Remove property"
      @click="remove"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.prop {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
}

.prop__label {
  width: 80px;
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prop__control {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.prop__input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--track);
  color: var(--txt);
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
}

.prop__input:focus {
  border-color: var(--acc);
}

.prop__input--locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.prop__swatch--locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.prop__input--hex {
  text-transform: lowercase;
}

.prop__unit {
  flex: none;
  font-size: 11px;
  color: var(--dim2);
}

.prop__swatch {
  position: relative;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 7px;
  border: 1px solid var(--line);
  cursor: pointer;
  overflow: hidden;
}

.prop__color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  border: none;
  padding: 0;
  cursor: pointer;
}

.prop__key {
  width: 28px;
  height: 28px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: none;
  color: var(--dim2);
  cursor: pointer;
}

.prop__key:hover {
  color: var(--txt);
}

.prop__key--active {
  color: var(--acc2);
  border-color: var(--acc);
  background: #14b8a61f;
}

.prop__diamond {
  font-size: 8px;
  line-height: 1;
}

.prop__remove {
  width: 24px;
  height: 28px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--dim2);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.prop__remove:hover {
  color: #ff7a90;
  background: #ffffff14;
}
</style>
