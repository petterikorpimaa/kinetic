/**
 * Whether an event target is a text-editing field, so global keyboard shortcuts
 * can step aside and let the field handle the key (e.g. native undo in an input).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
