/**
 * coachMoveExtractor
 * ------------------
 * Parses coach chat output for SAN move references ("consider Nf3",
 * "play Bxc4 first", "the key move is e4") and produces board-arrow
 * commands so the student sees what the coach is talking about —
 * without relying on the LLM remembering to emit [BOARD: arrow:...]
 * tags.
 *
 * Conservative by design:
 *   - Only draws arrows for moves that are LEGAL from the current FEN.
 *     Moves in a deeper future line get dropped (arrow would be wrong
 *     for the visible board).
 *   - Dedupes by from/to so "Nf3 ... Nf3" draws one arrow.
 *   - Caps the number of arrows so a long reply doesn't carpet the
 *     board.
 *   - Detects local negation ("don't play Nxe4") and colors those
 *     arrows red; non-negated moves are green.
 *   - Skips when the coach already emitted an explicit [BOARD: arrow]
 *     — the caller is expected to check for that first.
 */
import { Chess } from 'chess.js';
import type { BoardArrow } from '../types';

export interface ExtractMoveArrowsOptions {
  /** FEN of the position currently on the board. Required. */
  fen: string;
  /** Cap on arrows returned. Defaults to 3. */
  maxArrows?: number;
  /** Arrow color for recommended moves. Defaults to green. */
  goodColor?: string;
  /** Arrow color for explicitly negated moves ("don't play X"). */
  badColor?: string;
}

const DEFAULT_MAX = 3;
const DEFAULT_GOOD = 'rgba(34, 197, 94, 0.85)'; // green-500
const DEFAULT_BAD = 'rgba(239, 68, 68, 0.85)'; // red-500

/**
 * Broad SAN-like matcher. Captures:
 *   - Piece moves: Nf3, Bxc4, Qd5+, Nbd7 (with disambiguation)
 *   - Pawn moves / captures: e4, exd5, e8=Q, exf8=Q+
 *   - Castling: O-O, O-O-O (with optional check/mate)
 *
 * Matches are validated via chess.js before being kept — a false
 * positive like "A1" or "e4" as a non-move token gets filtered when
 * the move fails to apply.
 */
const SAN_RE =
  /\b(O-O-O[+#]?|O-O[+#]?|[NBRQK][a-h1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|[a-h](?:x[a-h])?[1-8](?:=[NBRQ])?[+#]?)\b/g;

/** Words near a SAN token that flip the intent from "consider this"
 *  to "avoid this". Checked within a small window before the token. */
const NEGATION_RE = /\b(don'?t|avoid|bad|never|mistake|blunder|wrong|not\s+(?:play|go))\b/i;
const NEGATION_WINDOW = 30; // chars before the move

export function extractMoveArrows(
  text: string,
  options: ExtractMoveArrowsOptions,
): BoardArrow[] {
  const max = options.maxArrows ?? DEFAULT_MAX;
  const good = options.goodColor ?? DEFAULT_GOOD;
  const bad = options.badColor ?? DEFAULT_BAD;

  if (!text.trim()) return [];

  const out: BoardArrow[] = [];
  const seen = new Set<string>();

  // Regex state is preserved across exec — reset for a fresh run.
  SAN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SAN_RE.exec(text)) !== null) {
    if (out.length >= max) break;
    const san = match[0];
    // Fresh Chess instance per candidate so we don't mutate state
    // across attempts (chess.js move() advances turn — we'd otherwise
    // only ever match Nf3 from start, never Nf6).
    const chess = new Chess(options.fen);
    let moved;
    try {
      moved = chess.move(san, { strict: false });
    } catch {
      continue;
    }
    const key = `${moved.from}${moved.to}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Check the ~30 chars before this match for a negation.
    const windowStart = Math.max(0, match.index - NEGATION_WINDOW);
    const pre = text.slice(windowStart, match.index);
    const isNegated = NEGATION_RE.test(pre);

    out.push({
      startSquare: moved.from,
      endSquare: moved.to,
      color: isNegated ? bad : good,
    });
  }
  return out;
}
