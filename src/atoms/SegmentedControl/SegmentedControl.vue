<script setup lang="ts" generic="T extends string">
import styles from './SegmentedControl.module.css';

// A track of pill segments with exactly one selected (the export format tabs).
// Selection is v-model; the active segment is marked with aria-selected and
// styled off that attribute, never a separate class. Pass testidPrefix to emit
// a data-testid of `${prefix}${id}` on each segment.
defineProps<{
  modelValue: T;
  items: readonly { id: T; label: string }[];
  testidPrefix?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: T] }>();
</script>

<template>
  <div :class="styles.track" role="tablist">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      role="tab"
      :class="styles.segment"
      :data-testid="testidPrefix ? `${testidPrefix}${item.id}` : undefined"
      :aria-selected="modelValue === item.id"
      @click="emit('update:modelValue', item.id)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
