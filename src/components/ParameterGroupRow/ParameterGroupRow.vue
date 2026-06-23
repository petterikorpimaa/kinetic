<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown } from '@lucide/vue';
import type { PropertyDef } from '@/core/properties';
import type { AnyTrack, NumericTrack, ColorTrack } from '@/types/track';
import { sampleNumber, sampleColor, hasKeyframeAt } from '@/core/animation';
import { useDocumentStore } from '@/stores/document';
import Button from '@/atoms/Button/Button.vue';
import PropertyValueField from '../PropertyValueField/PropertyValueField.vue';
import styles from './ParameterGroupRow.module.css';

// A property made of several parameters (e.g. drop shadow = offset X/Y, blur,
// colour) shown as one row: the first parameter sits inline on the header for a
// quick edit, with a single keyframe-dot and remove that act on the whole group;
// expanding reveals every parameter as a labelled sub-row (SVG-145).
interface GroupMember {
  readonly def: PropertyDef;
  readonly track: AnyTrack | undefined;
  /** Short label for the sub-row (the group header already names the effect). */
  readonly label: string;
}

const props = defineProps<{
  elementId: string;
  label: string;
  /** Prefix for test ids: `${testidBase}-group` / `-key` / `-remove`. */
  testidBase: string;
  members: readonly GroupMember[];
  time: number;
}>();

const store = useDocumentStore();
const open = ref(true);

const primary = computed(() => props.members[0]);
const isKeyed = computed(() =>
  props.members.some((m) => m.track !== undefined && hasKeyframeAt(m.track.keyframes, props.time)),
);

// Toggle a keyframe at the playhead for the whole group: when the group is
// already keyed here (the dot shows active), drop those keyframes; otherwise add
// one to every member at the value each currently shows.
function toggleKeyframe(): void {
  if (isKeyed.value) {
    for (const member of props.members) {
      store.removeKeyframeAt(props.elementId, member.def.key, props.time);
    }
    return;
  }
  for (const member of props.members) {
    if (member.def.kind === 'color') {
      const value = sampleColor(
        member.track as ColorTrack | undefined,
        props.time,
        member.def.defaultValue,
      );
      store.setColorValue(props.elementId, member.def.key, props.time, value);
    } else {
      const value = sampleNumber(
        member.track as NumericTrack | undefined,
        props.time,
        member.def.defaultValue,
      );
      store.setNumberValue(props.elementId, member.def.key, props.time, value);
    }
  }
}

function remove(): void {
  for (const member of props.members) store.removeProperty(props.elementId, member.def.key);
}
</script>

<template>
  <div :class="styles.group" :data-testid="`${testidBase}-group`">
    <div :class="styles.header">
      <span :class="styles.label">{{ label }}</span>

      <PropertyValueField
        v-if="primary"
        :element-id="elementId"
        :def="primary.def"
        :track="primary.track"
        :time="time"
      >
        <template #suffix>
          <button
            type="button"
            :class="styles.chevron"
            :aria-expanded="open"
            :title="open ? 'Collapse' : 'Expand'"
            @click="open = !open"
          >
            <ChevronDown
              :size="14"
              :stroke-width="1.8"
              :class="[styles.chevronIcon, open ? styles.chevronOpen : '']"
            />
          </button>
        </template>
      </PropertyValueField>

      <Button
        variant="icon"
        :class="styles.key"
        :active="isKeyed"
        :style="{ '--btn-bg': isKeyed ? '#14b8a61f' : 'transparent' }"
        :data-testid="`${testidBase}-key`"
        :data-active="isKeyed"
        :title="isKeyed ? 'Remove keyframe at playhead' : 'Add keyframe at playhead'"
        @click="toggleKeyframe"
      >
        <span :class="styles.diamond">◆</span>
      </Button>
      <Button
        variant="icon"
        plain
        danger
        :class="styles.remove"
        :data-testid="`${testidBase}-remove`"
        :title="`Remove ${label.toLowerCase()}`"
        @click="remove"
      >
        ×
      </Button>
    </div>

    <div
      v-for="member in members"
      v-show="open"
      :key="member.def.key"
      :class="styles.sub"
      :data-testid="`param-sub-${member.def.key}`"
    >
      <span :class="styles.subLabel">{{ member.label }}</span>
      <PropertyValueField
        :element-id="elementId"
        :def="member.def"
        :track="member.track"
        :time="time"
      />
    </div>
  </div>
</template>
