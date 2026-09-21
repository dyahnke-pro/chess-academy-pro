/**
 * DID THE TOOL DIE? One detector, read by every ship-check summarizer.
 *
 * THE DISEASE (PLAN §B 11c): a summarizer that COUNTS matches in a tool's
 * output reads a crash dump as ZERO — zero lint errors, zero type errors,
 * zero failed tests — and prints that count as a verdict. It has cost this
 * repo twice: a heap-dead eslint rendered as "0 errors", and a heap-dead tsc
 * rendered as "0 type errors", on the strength of which a ceiling was very
 * nearly lowered to 0. A dead process knows NOTHING; the only honest summary
 * is that the count is unknown.
 *
 * 🚨 THE TEXT REGEX ALONE IS NOT THE INSTRUMENT (2026-09-20). The first fix
 * detected a crash by grepping the child's own stdout for "FATAL ERROR" — but
 * that only catches deaths the child LIVES LONG ENOUGH TO NARRATE. A process
 * killed from outside — the kernel OOM killer, a `kill -9`, a harness timeout
 * — prints nothing at all: the `Killed: 9` line a human sees is written by
 * their SHELL, about the child, and never appears in the child's own output.
 * So the exact failure the guard was written for could still arrive as an
 * EMPTY string, score zero errors, and recommend lowering a ceiling to 0.
 *
 * The instrument for "did this process die" is its EXIT STATUS, not a regex
 * on what it managed to say first. `spawnSync` hands back `signal` (set when
 * killed), `error` (set when the spawn itself failed — command not found),
 * and `status` (null when a signal ended it). Those are checked FIRST; the
 * text match stays as the fallback for a self-narrated V8 death, which really
 * does exit 1 with a status and no signal.
 *
 * @param {string} out   combined stdout+stderr of the step
 * @param {{status?: number|null, signal?: string|null, error?: Error}} [res]
 *        the spawnSync result, when the caller has it. Omitted = text only.
 */
export function crashed(out, res) {
  if (res) {
    if (res.error) return true;                       // spawn itself failed
    if (res.signal) return true;                      // killed from outside
    if (res.status === null || res.status === undefined) return true; // no clean exit
  }
  return CRASH_SIGNATURES.test(out ?? '');
}

export const CRASH_SIGNATURES =
  /FATAL ERROR|heap out of memory|Reached heap limit|Segmentation fault|Abort trap|Killed: 9|SIGABRT|JavaScript heap/;
