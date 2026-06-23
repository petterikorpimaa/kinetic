<script setup lang="ts">
import { computed } from 'vue';
import styles from './Field.module.css';

// One text / number / select control. The element's look — height, border,
// background, focus ring, locked/disabled dimming — lives here; the call site
// sets its exact dimensions and context through the --field-* custom properties
// and a small co-located class. Value and events fall through natively
// (:value, @change, @input, data-*, min/max/step), like the Button atom.
type FieldType = 'text' | 'number' | 'select';

const props = withDefaults(
  defineProps<{
    type?: FieldType;
    disabled?: boolean;
    /** Editing is unavailable in the current context (e.g. multi-select). Disables + dims. */
    locked?: boolean;
  }>(),
  {
    type: 'text',
    disabled: false,
    locked: false,
  },
);

const isSelect = computed(() => props.type === 'select');
const isDisabled = computed(() => props.disabled || props.locked);
</script>

<template>
  <select v-if="isSelect" :class="styles.field" data-field="select" :disabled="isDisabled">
    <slot />
  </select>
  <input v-else :type="type" :class="styles.field" :data-field="type" :disabled="isDisabled" />
</template>
