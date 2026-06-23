<script setup lang="ts">
import { computed } from 'vue';
import styles from './ProgressBar.module.css';

// A determinate progress bar: a track with an accent fill whose width tracks
// value/max (clamped to 0–100%). Exposes role="progressbar" + aria value attrs.
// Track height and colours come from --progress-* custom properties.
const props = withDefaults(defineProps<{ value: number; max?: number }>(), { max: 100 });

const fraction = computed(() => {
  if (props.max <= 0) return 0;
  return Math.min(1, Math.max(0, props.value / props.max));
});

const fillWidth = computed(() => `${fraction.value * 100}%`);
</script>

<template>
  <div
    :class="styles.track"
    role="progressbar"
    :aria-valuenow="value"
    aria-valuemin="0"
    :aria-valuemax="max"
  >
    <span :class="styles.fill" :style="{ width: fillWidth }" />
  </div>
</template>
