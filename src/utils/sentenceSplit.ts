// Splitting spoken narration into sentences, without splitting a number.
//
// This lived inside `usePhaseNarration` as one regex — /([^.!?]+[.!?])(?=\s|$)/g
// — and it shipped a defect that only a live game caught. On
//
//   "It wins the bishop on e7 (worth 3.7 points)."
//
// the match attempt starting at index 0 runs to the decimal point, fails its
// lookahead because a digit follows, and the engine then does what regex
// engines do: it advances the start index and tries again. The attempt
// beginning after that point matches "7 points)." — lookahead satisfied at end
// of text — so the student heard a lone "7 points)." spoken as its own
// utterance (Learn game vs prod, 2026-08-09).
//
// A hand scan cannot recover that way: a terminator between two digits is
// skipped IN PLACE, so the sentence continues through the number instead of the
// split being re-found halfway along it.

/** A terminator that genuinely ends a sentence at `i`. */
function endsSentence(text: string, i: number): boolean {
  const ch = text[i];
  if (ch !== '.' && ch !== '!' && ch !== '?') return false;
  const prev = text[i - 1];
  const next = text[i + 1];
  // "3.7" — a decimal, not two sentences.
  if (/\d/.test(prev ?? '') && /\d/.test(next ?? '')) return false;
  // "e.g." / "i.e." — a single letter sitting between two periods is part of
  // an abbreviation, so the trailing period is not a full stop even though a
  // space follows it. Real prose never ends a sentence "…X.y.", which is what
  // keeps this from swallowing a genuine break.
  if (/[a-z]/i.test(prev ?? '') && text[i - 2] === '.') return false;
  // End of text ends the sentence; otherwise whitespace must follow. A
  // terminator glued to the next character is an abbreviation, a decimal, or
  // punctuation inside a word — never a full stop.
  return next === undefined || /\s/.test(next);
}

/**
 * Split `text` into complete sentences plus whatever trails after the last one.
 *
 * `rest` is what a streaming caller should keep buffering. A caller holding the
 * whole text can ignore it — a trailing fragment with no terminator is not a
 * sentence and speaking it would be the very bug this module exists to stop.
 */
export function splitSpeakableSentences(text: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (!endsSentence(text, i)) continue;
    const sentence = text.slice(start, i + 1).trim();
    if (sentence) sentences.push(sentence);
    start = i + 1;
  }
  return { sentences, rest: text.slice(start) };
}
