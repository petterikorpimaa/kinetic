<script setup lang="ts">
import { computed } from 'vue';
import type { PropertyDef } from '@/core/properties';
import { formatNumber } from '@/core/properties';
import type { AnyTrack, NumericTrack, ColorTrack } from '@/types/track';
import { sampleNumber, sampleColor } from '@/core/animation';
import { normalizeHex } from '@/core/color';
import { useDocumentStore } from '@/stores/document';
import Field from '@/atoms/Field/Field.vue';
import ColorField from '@/atoms/ColorField/ColorField.vue';
import styles from './PropertyValueField.module.css';

// The value control for one property — a number field (+ unit) or a colour
// swatch + hex. Editing writes a keyframe at the playhead via the store. Shared
// by the single PropertyRow and the multi-parameter group row so both edit the
// same way (SVG-145).
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

function selectAll(event: FocusEvent): void {
  (event.target as HTMLInputElement).select();
}
</script>

<template>
  <div :class="styles.control">
    <template v-if="def.kind === 'color'">
      <ColorField
        :model-value="colorValue"
        :disabled="locked"
        title="Pick colour"
        @update:model-value="commitColor"
      />
      <div :class="[styles.box, styles.hex]">
        <Field
          :class="styles.input"
          :locked="locked"
          :value="colorValue"
          @change="onHexInput"
          @focus="selectAll"
        />
        <slot name="suffix" />
      </div>
    </template>
    <template v-else>
      <div :class="styles.box">
        <Field
          :class="styles.input"
          :locked="locked"
          :value="numericText"
          @change="commitNumber"
          @focus="selectAll"
        />
        <span v-if="unit" :class="styles.unit">{{ unit }}</span>
        <slot name="suffix" />
      </div>
    </template>
  </div>
</template>
