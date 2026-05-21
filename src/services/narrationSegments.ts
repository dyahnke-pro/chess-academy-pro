// Sentence-grained narration segmentation (David 2026-05-21, "use beats,
// finer — but don't make it choppy"). A beat's narration paragraph is split
// into whole SENTENCES (natural prosodic units — they sound human spoken on
// their own), and each board marker (arrow / highlight) is paired with the
// sentence that NAMES its square. A voice-gated player then speaks one
// sentence at a time and reveals that sentence's squares as it's voiced, so
// the eye lands on the square exactly as the coach says its name — while the
// audio stays smooth (whole sentences, with the next one prefetched).
//
// This is NOT TTS-driven (no word-boundary timing). The reveal is gated by
// the per-sentence speak promise resolving, the same way beats advance.

/** A square coordinate like "e4". */
const SQUARE_RE = /\b([a-h][1-8])\b/g;
const PIECE_SQUARE_RE = /\b[NBRQK]([a-h][1-8])\b/g;

/** Every board square a sentence names — bare ("d5") or via a piece token
 *  ("Nd5"). Used to pair markers with the sentence that mentions them. */
export function squaresInText(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(PIECE_SQUARE_RE)) out.add(m[1]);
  for (const m of text.matchAll(SQUARE_RE)) out.add(m[1]);
  return out;
}

/** Split prose into whole sentences, keeping terminal punctuation. Falls back
 *  to the whole string when there are no sentence breaks. Conservative on
 *  purpose — chess narration rarely uses mid-sentence abbreviations, and an
 *  occasional over-split just speaks a short clause, never breaks. */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [trimmed];
}

export interface NarrationSegment {
  /** The sentence to speak as one smooth utterance. */
  text: string;
  /** Marker squares to REVEAL when this sentence starts (cumulative reveal is
   *  the player's job; this is just the squares this sentence introduces). */
  revealSquares: string[];
}

/**
 * Pair each sentence with the marker squares it names. `markerSquares` is the
 * full set of squares the beat's arrows/highlights touch. A square is revealed
 * by the first sentence that names it. Any marker square NO sentence names is
 * attached to the LAST sentence so nothing is ever left un-revealed.
 */
export function buildNarrationSegments(
  text: string,
  markerSquares: readonly string[],
): NarrationSegment[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];
  const remaining = new Set(markerSquares);
  const segments: NarrationSegment[] = sentences.map((sentence) => {
    const named = squaresInText(sentence);
    const reveal: string[] = [];
    for (const sq of markerSquares) {
      if (remaining.has(sq) && named.has(sq)) {
        reveal.push(sq);
        remaining.delete(sq);
      }
    }
    return { text: sentence, revealSquares: reveal };
  });
  // Anything never named lands on the last sentence (fallback — never lost).
  if (remaining.size > 0) {
    segments[segments.length - 1].revealSquares.push(...remaining);
  }
  return segments;
}

export interface SpeakSegmentsDeps {
  /** Speak one sentence; resolves when it finishes. */
  speak: (text: string) => Promise<void>;
  /** Warm the next sentence's audio while the current one plays (smooth seam). */
  prefetch?: (text: string) => void;
  /** Reveal the squares this segment introduces (called BEFORE its speak). */
  reveal: (squares: string[]) => void;
  /** Bail out early if this returns true (e.g. a newer step superseded us). */
  cancelled?: () => boolean;
}

/**
 * Play segments in order: reveal a segment's squares, prefetch the next
 * segment's audio, then speak the current segment to completion. Resolves when
 * the last sentence finishes — that resolution is what gates beat-advance, so
 * the existing voice-gated runtime is unchanged (it just awaits this).
 */
export async function speakSegments(
  segments: readonly NarrationSegment[],
  deps: SpeakSegmentsDeps,
): Promise<void> {
  for (let i = 0; i < segments.length; i++) {
    if (deps.cancelled?.()) return;
    deps.reveal(segments[i].revealSquares);
    const nextText = segments[i + 1]?.text;
    if (nextText && deps.prefetch) deps.prefetch(nextText);
    await deps.speak(segments[i].text);
  }
}
