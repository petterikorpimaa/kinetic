<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import {
  PROPERTY_GROUPS,
  propertiesInGroup,
  DROP_SHADOW_MEMBERS,
  DROP_SHADOW_LABEL,
  type PropertyGroup,
} from '@/core/properties';
import { unsupportedReason } from '@/core/shapeProperties';
import type { AnimatableProperty } from '@/types/track';
import { useDocumentStore } from '@/stores/document';
import Popover from '@/atoms/Popover/Popover.vue';
import MenuItem from '@/atoms/MenuItem/MenuItem.vue';
import SectionLabel from '@/atoms/SectionLabel/SectionLabel.vue';
import EmptyState from '@/atoms/EmptyState/EmptyState.vue';
import styles from './AddPropertyMenu.module.css';

// Grouped add-property menu (M2, Epic 6): Transform / Appearance / Filters,
// showing only inactive properties. Drop-shadow's tracks collapse into a single
// "Drop Shadow" entry that adds them together (SVG-59). Properties the selected
// shape can't support are listed but disabled, with a tooltip explaining why
// (SVG-156). The panel is `position: fixed`, anchored to its slot, so it floats
// above the inspector's scroll overflow instead of being clipped by it.
const props = defineProps<{ elementId: string; activeKeys: readonly AnimatableProperty[] }>();
const emit = defineEmits<{ close: [] }>();

const store = useDocumentStore();

// Anchor the floating panel to the "Add property" button (the menu's own DOM
// parent), recomputing while it's open so a scroll or resize keeps it aligned.
const menuRef = ref<HTMLElement>();
const anchorPos = ref<{ top: number; left: number; width: number } | null>(null);

function measure(): void {
  const anchor = menuRef.value?.parentElement;
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  anchorPos.value = { top: rect.bottom + 6, left: rect.left, width: rect.width };
}

const menuStyle = computed(() =>
  anchorPos.value === null
    ? {}
    : {
        top: `${anchorPos.value.top}px`,
        left: `${anchorPos.value.left}px`,
        width: `${anchorPos.value.width}px`,
      },
);

onMounted(() => {
  measure();
  window.addEventListener('scroll', measure, true);
  window.addEventListener('resize', measure);
});
onBeforeUnmount(() => {
  window.removeEventListener('scroll', measure, true);
  window.removeEventListener('resize', measure);
});

interface MenuEntry {
  readonly key: string;
  readonly label: string;
  readonly members?: readonly AnimatableProperty[];
  readonly reason: string | null;
}

const SHADOW_MEMBERS: readonly string[] = DROP_SHADOW_MEMBERS;

// The selected shape's tag(s). Selection is single-element today, but the
// support check is built around a set so it extends to multi-select unchanged.
const selectedTags = computed<string[]>(() => {
  const element = store.document.elements.find((candidate) => candidate.id === props.elementId);
  return element ? [element.tag] : [];
});

/** First unsupported member's reason (composites are supported only if all members are). */
function reasonForMembers(members: readonly AnimatableProperty[]): string | null {
  for (const property of members) {
    const reason = unsupportedReason(selectedTags.value, property);
    if (reason !== null) return reason;
  }
  return null;
}

function entriesForGroup(group: PropertyGroup): MenuEntry[] {
  const entries: MenuEntry[] = [];
  for (const def of propertiesInGroup(group)) {
    if (SHADOW_MEMBERS.includes(def.key)) continue; // surfaced via the composite below
    if (props.activeKeys.includes(def.key)) continue; // already added
    entries.push({
      key: def.key,
      label: def.label,
      reason: unsupportedReason(selectedTags.value, def.key),
    });
  }
  if (group === 'Filters' && !DROP_SHADOW_MEMBERS.every((m) => props.activeKeys.includes(m))) {
    entries.push({
      key: 'dropShadow',
      label: DROP_SHADOW_LABEL,
      members: DROP_SHADOW_MEMBERS,
      reason: reasonForMembers(DROP_SHADOW_MEMBERS),
    });
  }
  return entries;
}

const groups = computed(() =>
  PROPERTY_GROUPS.map((group) => ({ group, items: entriesForGroup(group) })).filter(
    (entry) => entry.items.length > 0,
  ),
);

const allAdded = computed(() => groups.value.length === 0);

function add(entry: MenuEntry): void {
  if (entry.reason !== null) return; // unsupported — disabled
  const members = entry.members ?? [entry.key as AnimatableProperty];
  for (const property of members) {
    if (!props.activeKeys.includes(property)) store.addProperty(props.elementId, property);
  }
  emit('close');
}
</script>

<template>
  <Popover :open="true" :backdrop-z="20" @update:open="emit('close')">
    <div ref="menuRef" :class="styles.menu" :style="menuStyle" data-testid="add-property-menu">
      <EmptyState v-if="allAdded" :class="styles.empty">All properties added.</EmptyState>
      <div v-for="entry in groups" v-else :key="entry.group" :class="styles.group">
        <SectionLabel :class="styles.title">{{ entry.group }}</SectionLabel>
        <MenuItem
          v-for="item in entry.items"
          :key="item.key"
          :data-testid="`add-prop-${item.key}`"
          :disabled="item.reason !== null"
          :title="item.reason ?? undefined"
          @click="add(item)"
        >
          {{ item.label }}
        </MenuItem>
      </div>
    </div>
  </Popover>
</template>
