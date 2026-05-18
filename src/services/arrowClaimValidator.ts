/**
 * Arrow-claim validator — programmatic check that the coach's
 * response includes a `[BOARD: arrow:from-to:color]` marker for
 * every SAN-shaped move mentioned in the prose.
 *
 * The TEACH_MODE_ADDITION block in envelope.ts has a NON-NEGOTIABLE
 * arrows rule, but production audit (2026-05-18, David's report)
 * caught the brain ignoring it across multi-turn walkthrough
 * sessions. This module is the observability + (future) enforcement
 * layer that catches violations the prompt missed.
 *
 * First-cut behavior (Phase D of streaming-TTS standardization):
 *   - Detect violations
 *   - Caller emits a `coach-mentioned-san-without-arrow` audit event
 *   - Return the violation list so callers can decide what to do
 *     (audit-only for now; future: trigger a regen with a
 *     strengthened addendum, same pattern as tacticClaimValidator
 *     and the master-play claim validator)
 *
 * NEVER mutates the response. Pure read-only audit instrument.
 */

/** SAN-token regex. Catches the common move shapes the coach mentions
 *  in prose:
 *    - pawn moves: e4, exd5, e8=Q, e8=Q+, gxh1=Q#
 *    - piece moves: Nf3, Bxh7, R1e1, Qd1+, Nbd2, Nge2
 *    - castling: O-O, O-O-O, O-O+, O-O#
 *  Case-sensitive — pawn moves start with lowercase a-h, piece moves
 *  start with uppercase K/Q/R/B/N. Excludes single uppercase letters
 *  (the X in "X-ray attack") because those don't have a destination
 *  square. Excludes algebraic squares standing alone (e.g. "the e4
 *  square") by requiring at least 2 chars after a piece letter.
 *
 *  Bounded by word boundaries so "Nf3" matches but "infrared" doesn't.
 *  The negative lookahead `(?![a-z])` after the rank digit blocks
 *  matches like "f1news" from word-internal collisions.
 */
const SAN_TOKEN_RE = /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?[+#]?)\b(?![a-z])/g;

/** Allowlisted SAN-shaped tokens that aren't actual move references —
 *  square names spoken descriptively, file names, etc. These appear
 *  in prose like "the e4 square is weak" or "Black's d-file" and
 *  shouldn't count as move mentions. */
const NON_MOVE_PHRASE_PRECEDERS = new Set([
  'the', 'a', 'on', 'at', 'square', 'pawn', 'piece', 'file',
  'rank', 'diagonal', 'point', 'about', 'around', 'near',
]);

export interface ArrowViolation {
  /** The SAN-shaped token from the prose. */
  san: string;
  /** Approximate character offset where the token appears. */
  offsetInText: number;
  /** Context (~30 chars on either side) for debugging. */
  context: string;
}

export interface ArrowValidationResult {
  /** Every SAN-shaped move found in the response prose. */
  mentionedSans: string[];
  /** Every `[BOARD: arrow:from-to:color]` marker present. */
  arrowMarkers: string[];
  /** Mentioned SANs that have no matching arrow marker. */
  violations: ArrowViolation[];
}

/** Strip out arrow markers (and other `[BOARD: ...]` directives) so
 *  the SAN-token regex doesn't match inside them. The marker
 *  `[BOARD: arrow:e2-e4:green]` contains "e2" and "e4" — without
 *  stripping, the validator would treat the destination square in
 *  the marker as a "mentioned SAN with no arrow," producing
 *  false positives. */
function stripBoardMarkers(text: string): string {
  return text.replace(/\[BOARD:[^\]]*\]/g, ' ');
}

/** Scan `response` for SANs that lack a corresponding arrow marker.
 *  Returns the full mention list, the full marker list, and the
 *  violations subset.
 *
 *  Matching strategy: an arrow marker matches a mentioned SAN when
 *  the marker's destination square appears in the SAN. For example
 *  `[BOARD: arrow:e2-e4:green]` matches mentioned SANs `e4` and
 *  `exe4` — both reference the e4 square. This is intentionally
 *  loose: the brain can mention "Nf3" and draw the arrow on the
 *  destination only ("g1-f3" or just the from-to pair) and we
 *  consider it matched.
 *
 *  Filter: skip tokens that look like a SAN but are actually used as
 *  descriptive square references ("the e4 square", "Black's d-file").
 *  Detected by checking the word immediately preceding the token. */
export function validateArrowClaims(response: string): ArrowValidationResult {
  // Capture arrow markers separately before stripping for SAN scan.
  const markerRe = /\[BOARD:\s*arrow:([a-h][1-8])-([a-h][1-8])(?::[a-z]+)?\]/g;
  const markers: string[] = [];
  const markerSquares = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(response)) !== null) {
    markers.push(m[0]);
    markerSquares.add(m[1]);
    markerSquares.add(m[2]);
  }

  const cleaned = stripBoardMarkers(response);
  const mentioned: string[] = [];
  const violations: ArrowViolation[] = [];

  let match: RegExpExecArray | null;
  while ((match = SAN_TOKEN_RE.exec(cleaned)) !== null) {
    const san = match[0];
    const offset = match.index;

    // Skip when preceded by a descriptive non-move word ("the e4
    // square", "on a4", "at e5"). The preceding word is the previous
    // whitespace-bounded token before this match.
    const before = cleaned.slice(Math.max(0, offset - 16), offset);
    const precedingWord = before.trim().split(/\s+/).pop()?.toLowerCase() ?? '';
    if (NON_MOVE_PHRASE_PRECEDERS.has(precedingWord)) continue;

    mentioned.push(san);

    // The destination square of the SAN is the last 2 chars before
    // any check (+) / mate (#) / promotion (=Q) suffix.
    const destSquare = extractDestinationSquare(san);
    // Castling returns null — exempt from the violation list (no
    // single destination square to enforce; an arrow on the king's
    // landing square IS a valid choice but we don't require it).
    if (!destSquare) continue;
    if (markerSquares.has(destSquare)) continue; // arrow covers it

    violations.push({
      san,
      offsetInText: offset,
      context: cleaned.slice(Math.max(0, offset - 30), Math.min(cleaned.length, offset + san.length + 30)),
    });
  }

  return { mentionedSans: mentioned, arrowMarkers: markers, violations };
}

/** Pull the destination square from a SAN: last [a-h][1-8] occurrence
 *  before any trailing +, #, or promotion suffix. Returns null for
 *  castling (no specific destination square in the SAN — though the
 *  king's landing square is implied; we don't enforce arrows there). */
function extractDestinationSquare(san: string): string | null {
  if (/^O-O/.test(san)) return null; // castling — no enforced dest
  const stripped = san.replace(/[+#]$/, '').replace(/=[QRBN]$/, '');
  const m = stripped.match(/([a-h][1-8])$/);
  return m ? m[1] : null;
}
