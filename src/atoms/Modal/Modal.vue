<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { X } from '@lucide/vue';
import Button from '@/atoms/Button/Button.vue';
import styles from './Modal.module.css';

// The shared dialog shell: full-screen backdrop, centred panel, a head with the
// title and a close button, backdrop-click / Esc to dismiss, and a focus trap
// for the lifetime of the dialog. Consumers render content into the body slot
// and tune size/spacing through the --modal-* custom properties.
defineProps<{
  title?: string;
  /** data-testid for the inner panel (the overlay testid falls through to the root). */
  dialogTestid?: string;
}>();

const emit = defineEmits<{ close: [] }>();

const panel = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function focusables(): HTMLElement[] {
  if (!panel.value) return [];
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(panel.value.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute('disabled'),
  );
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
    return;
  }
  if (event.key !== 'Tab') return;
  const items = focusables();
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  panel.value?.focus();
});

onBeforeUnmount(() => {
  previouslyFocused?.focus?.();
});
</script>

<template>
  <div :class="styles.overlay" @click="emit('close')" @keydown="onKeydown">
    <div
      ref="panel"
      :class="styles.dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
      :data-testid="dialogTestid"
      @click.stop
    >
      <div :class="styles.head">
        <div :class="styles.titleArea">
          <h2 v-if="title" :class="styles.title">{{ title }}</h2>
          <slot name="subtitle" />
        </div>
        <slot name="actions" />
        <Button variant="icon" :class="styles.close" title="Close" @click="emit('close')">
          <X :size="15" :stroke-width="1.6" />
        </Button>
      </div>
      <slot />
    </div>
  </div>
</template>
