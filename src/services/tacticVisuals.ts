/**
 * tacticVisuals — turn a coach-pointed-out tactic into deterministic board
 * arrows + square highlights (David 2026-07-11: "when the coach points out a
 * tactic, draw arrows and highlight the important squares — it's hard to always
 * visualize"). G0/G3: every square is computed in CODE (chess.js + the tactic
 * detector), NEVER decided by the LLM. The coach describes the tactic in words;
 * this paints exactly what those words refer to so the student's eye lands on
 * the piece as they read it.
 *
 * Input is the position + the tactic's move line (the same `uciMoves` the tip
 * already carries). We draw:
 *   • a GREEN arrow on the key move (uciMoves[0]) — "here's the move",
 *   • ORANGE arrows on the tactic geometry it creates (attacker → each target,
 *     e.g. the two prongs of a fork, the pin/skewer line), and
 *   • the tactic's colored square highlights (the forked pieces, the pinned
 *     piece, a hanging piece) straight from `detectTactics`.
 */
import { Chess } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import type { BoardArrow, BoardHighlight } from '../types';
import { admitArrows, type ArrowClaim } from './arrowDoor';

const KEY_MOVE_SQUARE = 'rgba(34, 197, 94, 0.35)';  // green tint on its landing square

export interface TacticVisuals {
  arrows: BoardArrow[];
  highlights: BoardHighlight[];
}

const EMPTY: TacticVisuals = { arrows: [], highlights: [] };

/** Build the arrows + highlights for a tactic. `fen` is the position the tip
 *  was raised on; `uciMoves` is its best line (may be empty — then we just show
 *  whatever tactic already stands on the board). Never throws. */
export function buildTacticVisuals(fen: string | undefined, uciMoves: string[] | undefined): TacticVisuals {
  if (!fen) return EMPTY;
  const arrows: BoardArrow[] = [];
  const highlights: BoardHighlight[] = [];

  const first = uciMoves?.[0];
  if (!first || first.length < 4) {
    // No move line — surface the tactic already on the board.
    try { return { arrows, highlights: detectTactics(fen).highlights }; } catch { return EMPTY; }
  }

  const from = first.slice(0, 2);
  const to = first.slice(2, 4);
  // The puzzle's key move (its own solution — vouched) and, below, the lines
  // of the tactic it creates, all through the arrow door.
  const studentColor: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
  const claims: ArrowClaim[] = [{ from, to, role: 'play', vouchedBy: 'book', source: 'tacticVisuals.key' }];
  highlights.push({ square: to, color: KEY_MOVE_SQUARE });

  // Play the key move and read the tactic it creates — the forked pieces are
  // already on the board; only the attacker moves, so the target squares map
  // straight back onto the live position the student is looking at.
  try {
    const chess = new Chess(fen);
    chess.move({ from, to, promotion: first.length > 4 ? first[4] : undefined });
    const det = detectTactics(chess.fen());
    for (const h of det.highlights) highlights.push(h);
    for (const t of det.tactics) {
      const [attacker, ...targets] = t.involvedSquares;
      if (!attacker) continue;
      // Sight lines of the tactic, on the board AFTER the key move lands.
      for (const target of targets) {
        claims.push({ from: attacker, to: target, role: 'vision', fen: chess.fen(), source: 'tacticVisuals.line' });
      }
    }
  } catch {
    // Illegal/unparseable move — the key-move arrow above still shows.
  }

  // Dedupe highlights by square (later color wins) so a square named by both
  // the move and the tactic doesn't render twice.
  const bySquare = new Map<string, BoardHighlight>();
  for (const h of highlights) bySquare.set(h.square, h);
  arrows.push(...admitArrows(claims, { fen, studentColor }).arrows);
  return { arrows, highlights: Array.from(bySquare.values()) };
}
