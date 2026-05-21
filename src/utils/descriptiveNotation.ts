// Speech-only scrubber for 19th-century descriptive chess notation.
//
// The public-domain book passages (Lasker, Staunton, …) are written in
// descriptive notation — "P-Kt5", "B-K3", "Q-B2", "QB1-KR6", "KB5",
// "P-KKt3", "PxP", "O-O". sanitizeForTTS only knows modern SAN, so these
// tokens survive and get read aloud as garbled letters (the
// `sanitizer-leak` audit, 2026-05-21). We cannot convert them to
// algebraic without inventing squares (G3), so for SPEECH ONLY we elide
// runs of descriptive tokens to a short neutral phrase. The on-screen
// text is never changed — this only reshapes the string handed to TTS.

// A single descriptive token: a move (piece/pawn + - or x + target),
// a compound square (QB1, KR6, KB5, KKt3, K1), or castling.
const DESC_TOKEN =
  '(?:O-O-O|O-O|(?:Kt|[PNBRQK])\\s*[x×]\\s*(?:Kt|[PNBRQK]|[QK]?(?:Kt|[PNBRQK])?[1-8])|(?:Kt|[PNBRQK])-(?:[QK]?(?:Kt|[PNBRQK])?[1-8])|[QK](?:Kt|[PNBRQK])?[1-8])';

// One or more tokens joined by list separators (", ", " and ", "-" for
// diagonals like QB1-KR6, ";", " then ").
const DESC_RUN = new RegExp(
  `\\b${DESC_TOKEN}(?:\\s*(?:,\\s*and|,|and|then|;|-)\\s*${DESC_TOKEN})*`,
  'g',
);

/**
 * Replace runs of descriptive-notation tokens with a brief spoken
 * elision so an audiobook reads cleanly. Display text is untouched —
 * call this ONLY on the string passed to TTS.
 */
export function scrubDescriptiveNotationForSpeech(text: string): string {
  if (!text) return text;
  return text
    .replace(DESC_RUN, 'a specific line')
    // Tidy punctuation/space left by the elision.
    .replace(/\ba specific line\b(?:\s*(?:,|and|then|;)?\s*a specific line\b)+/g, 'a specific line')
    .replace(/\s+([.,;:)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
