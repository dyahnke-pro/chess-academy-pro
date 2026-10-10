// coachStopEvents — ONE leaf signal: "the student told the coach to stop".
//
// "stop" / "shh" in the chat reached no handler: the reader placed it as
// `stop`, nothing answered that kind, and small talk replied "That was not
// clear" while the voice kept talking (contracts 2026-10-10). Stopping is an
// ACTION, and the voice lives outside the coach modules, so the door emits
// here and the voice service — the one thing that can stop speech — listens.
// This module imports nothing, so the door stays free of the audio stack and
// every surface that asks through the door stops the same way.

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to stop requests. Returns the unsubscribe. */
export function onCoachStop(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The student asked the coach to stop talking. */
export function emitCoachStop(): void {
  for (const l of listeners) {
    try { l(); } catch { /* a listener never breaks the turn */ }
  }
}
