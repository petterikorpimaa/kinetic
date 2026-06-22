import { useEventListener } from '@vueuse/core';
import { usePlaybackStore } from '@/stores/playback';
import { useDocumentStore } from '@/stores/document';
import { SNAP_SECONDS, clampTime } from '@/core/timeline';
import { isTypingTarget } from './isTypingTarget';

/**
 * Global timeline shortcuts (M3, Epic 11): Space toggles playback, ←/→ nudge the
 * playhead ±0.05s, Delete/Backspace removes the selected keyframes. Ignored
 * while typing in a field. `preventDefault` keeps Space from also activating a
 * focused button (e.g. a selected keyframe) and Backspace from navigating back.
 * Mount once, from the editor shell.
 */
export function useTimelineKeyboard(): void {
  const playback = usePlaybackStore();
  const documentStore = useDocumentStore();

  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    const duration = documentStore.document.duration;

    switch (event.key) {
      case ' ':
        event.preventDefault();
        playback.toggle(duration);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        playback.setCurrentTime(clampTime(playback.currentTime - SNAP_SECONDS, duration));
        break;
      case 'ArrowRight':
        event.preventDefault();
        playback.setCurrentTime(clampTime(playback.currentTime + SNAP_SECONDS, duration));
        break;
      case 'Delete':
      case 'Backspace':
        if (documentStore.selectedKeyframeIds.size > 0) {
          event.preventDefault();
          documentStore.deleteSelectedKeyframes();
        }
        break;
    }
  });
}
