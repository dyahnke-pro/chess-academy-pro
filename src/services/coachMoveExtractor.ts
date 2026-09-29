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
import { admitArrows, namedMoveClaim, type ArrowClaim } from './arrowDoor';

export interface ExtractMoveArrowsOptions {
  /** FEN of the position currently on the board. Required. */
  fen: string;
  /** Cap on arrows returned. Defaults to 3. */
  maxArrows?: number;
  /** The student's side. Defaults to the side to move in `fen`. */
  studentColor?: 'white' | 'black';
}

const DEFAULT_MAX = 3;

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
  const ctx = { fen: options.fen, studentColor: options.studentColor ?? (options.fen.split(' ')[1] === 'b' ? 'black' as const : 'white' as const) };

  if (!text.trim()) return [];

  const claims: ArrowClaim[] = [];
  const seen = new Set<string>();

  // Regex state is preserved across exec — reset for a fresh run.
  SAN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SAN_RE.exec(text)) !== null) {
    if (claims.length >= max) break;
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

    // A NEGATED move ("don't play Qd3") is a bad move — it is never arrowed
    // (David 2026-09-29); the text says it. Every other named move goes
    // through the arrow door unvouched: the prose, not the engine, chose it,
    // so the door checks it is legal and safe on this board.
    if (isNegated) continue;
    claims.push(namedMoveClaim(moved.from, moved.to, ctx, undefined, 'coachMoveExtractor'));
  }
  return admitArrows(claims, ctx).arrows;
}
