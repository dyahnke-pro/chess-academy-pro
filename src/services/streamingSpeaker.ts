/**
 * streamingSpeaker — shared sentence-by-sentence Polly chain helper.
 *
 * Every Coach surface that streams an LLM response and speaks each
 * completed sentence as it lands has the same shape:
 *   1. First sentence: `speakIfFree` so a phase-narration / hint /
 *      tactic-alert in flight gets to finish without being clipped.
 *   2. Subsequent sentences: chained via `speakForced` so each Polly
 *      call awaits the previous one's audio (single-engine, no
 *      Polly+Web-Speech overlap).
 *
 * The bug this helper fixes: when first-sentence `speakIfFree` drops
 * (because Polly was busy), the original chain still kicked off
 * `speakForced` for sentence 2+ — which CUT OFF the very thing
 * `speakIfFree` was trying to protect. The polite-drop semantic was
 * undone the moment the second sentence arrived.
 *
 * Production audit (build 6459def+) Finding 167 caught this on
 * /coach/play; the same pattern existed unfixed in CoachAnalysePage,
 * ExplainPositionSessionView, and CoachSessionPlanPage. Centralizing
 * the chain logic here so all four surfaces get the fix and any
 * future streaming surface picks it up by default.
 */
import { voiceService } from './voiceService';

export interface StreamingSpeaker {
  /** Add a completed sentence to the speech chain. Trims; empty
   *  sentences are silently dropped. The first sentence speaks via
   *  `speakIfFree` (defers to in-flight speech). When that drop
   *  happens (Polly was busy at first-sentence time), every
   *  subsequent sentence in this stream is also dropped — the chain
   *  is "abandoned" so the in-flight narration plays through cleanly.
   *  Otherwise sentences chain via `speakForced`, each awaiting the
   *  previous one's audio. */
  add(sentence: string): void;
  /** Total sentences that were added (including dropped ones). */
  count(): number;
  /** True when the first sentence found Polly busy and the stream
   *  is abandoned. Surfaces that want to know whether to fire a
   *  fallback "speak the full response at the end" can check this. */
  isAbandoned(): boolean;
  /** Force-abandon the stream (e.g. user pressed Stop, or component
   *  unmounted). Subsequent `.add()` calls become no-ops; in-flight
   *  Polly playback is NOT stopped (call voiceService.stop() for that). */
  abandon(): void;
}

/** Create a fresh streaming speaker for one LLM stream. Caller stores
 *  the instance in a ref and calls `add` for each completed sentence
 *  emitted by the streaming sentence dispatcher. */
export function createStreamingSpeaker(): StreamingSpeaker {
  let chain: Promise<void> = Promise.resolve();
  let sentenceCount = 0;
  let abandoned = false;
  let chainStarted = false;

  return {
    add(sentence: string): void {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      if (abandoned) {
        // Still count attempts so callers can distinguish
        // "no sentences ever arrived" from "sentences arrived but
        // the stream was deferred" via count() vs isAbandoned().
        sentenceCount += 1;
        return;
      }
      sentenceCount += 1;
      if (!chainStarted) {
        chainStarted = true;
        // Snapshot isPlaying BEFORE speakIfFree mutates state. If
        // Polly is busy right now, the first sentence's speakIfFree
        // will drop politely — we honor that drop by abandoning the
        // rest of this batch. Defensive `typeof` check so unit-test
        // mocks of voiceService that omit `isPlaying` don't throw —
        // those mocks intentionally elide the playback subsystem.
        if (typeof voiceService.isPlaying === 'function' && voiceService.isPlaying()) {
          abandoned = true;
        }
        chain = voiceService.speakIfFree(trimmed).catch(() => undefined);
      } else {
        chain = chain
          .then(() => voiceService.speakForced(trimmed))
          .catch(() => undefined);
      }
    },
    count(): number {
      return sentenceCount;
    },
    isAbandoned(): boolean {
      return abandoned;
    },
    abandon(): void {
      abandoned = true;
    },
  };
}
