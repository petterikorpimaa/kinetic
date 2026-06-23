<script setup lang="ts">
import { computed } from 'vue';
import type { PropertyDef } from '@/core/properties';
import type { AnyTrack, NumericTrack, ColorTrack } from '@/types/track';
import { sampleNumber, sampleColor, hasKeyframeAt } from '@/core/animation';
import { useDocumentStore } from '@/stores/document';
import Button from '@/atoms/Button/Button.vue';
import PropertyValueField from '../PropertyValueField/PropertyValueField.vue';
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

const isKeyed = computed(
  () => props.track !== undefined && hasKeyframeAt(props.track.keyframes, props.time),
);

// Toggle a keyframe at the playhead: remove it when one is already there
// (the dot shows active), otherwise add one at the value currently shown.
function toggleKeyframe(): void {
  if (isKeyed.value) {
    store.removeKeyframeAt(props.elementId, props.def.key, props.time);
    return;
  }
  if (props.def.kind === 'color') {
    const value = sampleColor(
      props.track as ColorTrack | undefined,
      props.time,
      props.def.defaultValue,
    );
    store.setColorValue(props.elementId, props.def.key, props.time, value);
  } else {
    const value = sampleNumber(
      props.track as NumericTrack | undefined,
      props.time,
      props.def.defaultValue,
    );
    store.setNumberValue(props.elementId, props.def.key, props.time, value);
  }
}

function remove(): void {
  store.removeProperty(props.elementId, props.def.key);
}
</script>

<template>
  <div :class="styles.prop" :data-testid="`prop-row-${def.key}`">
    <span :class="styles.label">{{ def.label }}</span>

    <PropertyValueField :element-id="elementId" :def="def" :track="track" :time="time" />

    <Button
      variant="icon"
      :class="styles.key"
      :active="isKeyed"
      :style="{ '--btn-bg': isKeyed ? '#14b8a61f' : 'transparent' }"
      :data-testid="`prop-key-${def.key}`"
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
      :data-testid="`prop-remove-${def.key}`"
      title="Remove property"
      @click="remove"
    >
      ×
    </Button>
  </div>
</template>
