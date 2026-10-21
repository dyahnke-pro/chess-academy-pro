// oneAtATime — a keyed queue: work for a key starts only once every earlier
// work queued under that key has settled, in call order.
//
// A writer that reads what is there and writes what is missing is correct only
// one run at a time: two runs at once both read "nothing yet" and both write
// it. David's record, 2026-10-20: one game's slips were filed 24 times in four
// seconds, by passes over the same game running side by side. Queued, the
// second run reads what the first wrote. A leaf: no imports.

/** Each key's line: the promise its last queued work settles on. */
export type KeyedQueue = Map<string, Promise<void>>;

/** Run `work` once every earlier `work` queued under `key` has settled. A
 *  failed run never blocks the next one. */
export function oneAtATime<T>(queue: KeyedQueue, key: string, work: () => Promise<T>): Promise<T> {
  const run = (queue.get(key) ?? Promise.resolve()).then(work);
  const tail = run.then(() => undefined, () => undefined);
  queue.set(key, tail);
  void tail.then(() => { if (queue.get(key) === tail) queue.delete(key); });
  return run;
}
