/**
 * Is a key event aimed at a field the student is typing in? Page-level key
 * shortcuts (space = play/pause, arrows = step) must leave those keys alone
 * there: review's space shortcut swallowed every space typed into its ask
 * box, so "what's the best move here?" arrived as "what'sthebestmovehere?"
 * and the walk toggled on each word (all-screens walk 2026-10-09).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string') return false;
  const el = target as HTMLElement;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable === true;
}
