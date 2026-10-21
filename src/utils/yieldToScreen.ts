// yieldToScreen — hand the main thread back between units of heavy work, so a
// tap, a paint, a voice timer or the walk's next step runs in between.
//
// WHY (Review freeze, 2026-10-21, profiled on the production build): after
// Start the screen was busy ~99% for ~95 s — the whole game's narration built
// in one synchronous task, then every projected line's facts in another. An
// awaited engine read that is already cached resolves as a MICROTASK and hands
// nothing back, so "the code is async" did not mean the screen could breathe.
//
// A macrotask at the BACK of the queue: a MessageChannel message (no 4 ms
// timer clamp, and fake timers in tests do not freeze it), else a zero timer.
// NOT `scheduler.yield()`: Chrome resumes a yielded task AHEAD of the tasks
// already waiting, so the walk's own timers still sat behind the build (one
// ~10 s held stretch remained when it was used). A leaf — no imports.
export function yieldToScreen(): Promise<void> {
  if (typeof MessageChannel === 'function') {
    return new Promise<void>((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (): void => { ch.port1.close(); resolve(); };
      ch.port2.postMessage(null);
    });
  }
  return new Promise<void>((resolve) => { setTimeout(resolve, 0); });
}
