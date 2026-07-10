/**
 * uid — collision-proof id for React list keys (chat messages, alerts, etc.).
 *
 * Bare `${prefix}-${Date.now()}` ids collide when two items are created in the
 * same millisecond (rapid ask → ack → response, back-to-back narration/alerts).
 * Identical ids become identical React keys, and the duplicate re-renders on
 * every render — flooding "Encountered two children with the same key" and
 * dropping/duplicating list items (the 2026-06-12 dup-key class; the coach chat
 * flood the polyglot loop audit caught 2026-07-10). A process-monotonic counter
 * guarantees uniqueness regardless of clock resolution.
 */
let seq = 0;

export function uid(prefix: string): string {
  seq = (seq + 1) & 0xffffff;
  return `${prefix}-${Date.now()}-${seq}`;
}
