<script setup lang="ts">
import styles from './Chip.module.css';

// A pill toggle (the easing preset buttons). The pressed look is driven by
// aria-pressed, not a class; size comes from --chip-* custom properties. Label
// via the default slot; native attrs (data-*, @click) fall through.
withDefaults(defineProps<{ active?: boolean }>(), { active: false });
</script>

<template>
  <button type="button" :class="styles.chip" :aria-pressed="active">
    <slot />
  </button>
</template>
