<script setup lang="ts">
import styles from './SectionLabel.module.css';

// The uppercase, letter-spaced eyebrow used above panels and sections. Defaults
// to the common 10px / 0.1em / 700 / dim treatment; a call site overrides size,
// spacing, weight or colour through the --eyebrow-* custom properties and adds
// its own layout (display, margins) on the same element. Text via the slot.
</script>

<template>
  <span :class="styles.eyebrow"><slot /></span>
</template>
