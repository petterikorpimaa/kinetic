<script setup lang="ts">
import { computed } from 'vue';
import type { PropertyDef } from '@/core/properties';
import { formatNumber } from '@/core/properties';
import type { AnyTrack, NumericTrack, ColorTrack } from '@/types/track';
import { sampleNumber, sampleColor, hasKeyframeAt } from '@/core/animation';
import { normalizeHex } from '@/core/color';
import { useDocumentStore } from '@/stores/document';
import Button from '@/atoms/Button/Button.vue';
import styles from './PropertyRow.module.css';

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
  <div :class="styles.prop" :data-testid="`prop-row-${def.key}`">
    <span :class="styles.label">{{ def.label }}</span>

    <div :class="styles.control">
      <template v-if="def.kind === 'color'">
        <label
          :class="[styles.swatch, locked ? styles.locked : '']"
          :style="{ background: colorValue }"
          title="Pick colour"
        >
          <input
            type="color"
            :value="colorValue"
            :class="styles.colorInput"
            :disabled="locked"
            @input="onHexInput"
          />
        </label>
        <input
          type="text"
          :class="[styles.input, styles.hex, locked ? styles.locked : '']"
          :value="colorValue"
          :disabled="locked"
          @change="onHexInput"
          @focus="selectAll"
        />
      </template>
      <template v-else>
        <input
          type="text"
          :class="[styles.input, locked ? styles.locked : '']"
          :value="numericText"
          :disabled="locked"
          @change="commitNumber"
          @focus="selectAll"
        />
        <span v-if="unit" :class="styles.unit">{{ unit }}</span>
      </template>
    </div>

    <Button
      variant="icon"
      :class="styles.key"
      :active="isKeyed"
      :style="{ '--btn-bg': isKeyed ? '#14b8a61f' : 'transparent' }"
      :data-testid="`prop-key-${def.key}`"
      :data-active="isKeyed"
      title="Add keyframe at playhead"
      @click="addKeyframe"
    >
      <span :class="styles.diamond">◆</span>
    </Button>
    <Button
      variant="icon"
      plain
      danger
      :class="styles.remove"
      :data-testid="`prop-remove-${def.key}`"
      title="Remove property"
      @click="remove"
    >
      ×
    </Button>
  </div>
</template>
