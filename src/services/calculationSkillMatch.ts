/**
 * calculationSkillMatch
 * ---------------------
 * The pattern gate that lets a GAME-DERIVED puzzle (a position mined
 * from the student's own played games) into a Calculation skill drill
 * — but ONLY when its solution line genuinely demonstrates that skill's
 * pattern.
 *
 * The six calculation skills are defined by Lichess theme tags
 * (`mateIn2..5`, `quietMove`, `long`, `advancedPawn`/`promotion`,
 * `sacrifice`/`deflection`, `endgame`). Game-derived puzzles carry a
 * `TacticType` (fork/pin/skewer/…) that does NOT reverse-map onto those
 * skills — a stored `fork` tag says nothing about whether the line is a
 * mate, a quiet move, or a pawn race. So we DON'T trust the tag: we
 * replay the actual solution line with chess.js and return the calc-skill
 * themes the line provably exhibits.
 *
 * This is the same architectural contract as everywhere else — the fact
 * (which pattern the line shows) is COMPUTED in code, never asserted by
 * an LLM or a lossy stored label (G0/G3).
 *
 * `defensiveMove` is deliberately NOT emitted here: "the only move that
 * holds" needs a multi-candidate engine pass to verify, and mislabeling a
 * mistake puzzle as defensive is worse than leaving Defensive Calc on the
 * static pool. Empty > invented.
 */
import { Chess, type Move } from 'chess.js';
import type { TacticType } from '../types';

export interface CalcMatchMeta {
  /** The stored motif tag, when present. Only used to carry through
   *  `deflection` (which the geometric replay here doesn't detect). */
  tacticType?: TacticType | null;
  /** Game phase of the source position — an `endgame`-phase puzzle
   *  feeds the "Adaptive (auto)" tile (themes: `endgame`). */
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
}

/** Standard piece values for the sacrifice (material-investment) probe.
 *  King is uncounted. */
const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/** Net material from `color`'s perspective across the whole board
 *  (own material − opponent material), in pawns. */
function boardMaterialNet(chess: Chess, color: 'w' | 'b'): number {
  let net = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      const v = PIECE_VALUE[sq.type] ?? 0;
      net += sq.color === color ? v : -v;
    }
  }
  return net;
}

/** Rank digit (1-8) a UCI/SAN destination lands on. */
function toRank(square: string): number {
  return Number(square[1]);
}

/**
 * Given the position (student to move) and the solution line in UCI,
 * return the set of calculation-skill Lichess themes the line genuinely
 * demonstrates. Any-of match against a skill's themes decides eligibility.
 *
 * Returns `[]` when the line is illegal/empty or matches no pattern — such
 * a puzzle is simply not offered to any skill (never force-fit).
 */
export function matchCalculationThemes(
  fen: string,
  solutionUci: string[],
  meta: CalcMatchMeta = {},
): string[] {
  const themes = new Set<string>();
  const moves = solutionUci.filter(Boolean);
  if (moves.length === 0) return [];

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return [];
  }

  const studentColor = chess.turn(); // side to move at the puzzle FEN
  const startNet = boardMaterialNet(chess, studentColor);
  let minNet = startNet;
  const studentMoves: Move[] = [];
  let lastMoveColor: 'w' | 'b' | null = null;

  for (const uci of moves) {
    let move: Move;
    try {
      move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
    } catch {
      // Illegal move in the stored line — bail, classify nothing.
      return [];
    }
    lastMoveColor = move.color;
    if (move.color === studentColor) studentMoves.push(move);
    const net = boardMaterialNet(chess, studentColor);
    if (net < minNet) minNet = net;
  }

  if (studentMoves.length === 0) return [];

  const finalNet = boardMaterialNet(chess, studentColor);
  const isMate = chess.isCheckmate();

  // ── Find the Mate ──────────────────────────────────────────────
  // Only when the line LITERALLY ends in checkmate delivered by the
  // student. N = the student's ply count to mate. A truncated PV that
  // doesn't reach `#` is (conservatively) not a mate puzzle.
  if (isMate && lastMoveColor === studentColor) {
    const n = studentMoves.length;
    if (n >= 1 && n <= 5) themes.add(`mateIn${n}`);
  }

  // ── Forcing Sequence (Lichess `long`) ──────────────────────────
  // ≥3 student moves = a genuinely long calculation.
  if (studentMoves.length >= 3) themes.add('long');

  // ── Quiet Move ─────────────────────────────────────────────────
  // The student's FIRST move is not a check, not a capture, not a
  // promotion — the winning move that isn't forcing.
  const first = studentMoves[0];
  const firstIsCheck = first.san.includes('+') || first.san.includes('#');
  const firstIsCapture = Boolean(first.captured) || first.san.includes('x');
  const firstIsPromotion = Boolean(first.promotion);
  if (!firstIsCheck && !firstIsCapture && !firstIsPromotion) {
    themes.add('quietMove');
  }

  // ── Race Calculation (advancedPawn / promotion) ────────────────
  for (const m of studentMoves) {
    if (m.promotion) {
      themes.add('promotion');
      themes.add('advancedPawn');
      break;
    }
  }
  if (!themes.has('advancedPawn')) {
    for (const m of studentMoves) {
      if (m.piece !== 'p') continue;
      const rank = toRank(m.to);
      // A student pawn reaching its 7th/8th rank (white) or 2nd/1st
      // (black) is a genuine advanced/passed-pawn push.
      if (
        (studentColor === 'w' && rank >= 7) ||
        (studentColor === 'b' && rank <= 2)
      ) {
        themes.add('advancedPawn');
        break;
      }
    }
  }

  // ── Tactical Pattern (sacrifice / deflection) ──────────────────
  // Sacrifice: the student's own net material genuinely dips below the
  // starting value at some point (a real investment), then the line
  // either recovers material or ends in mate — the sac paid off.
  const invested = minNet <= startNet - 1;
  const paidOff = isMate || finalNet >= minNet + 1;
  if (invested && paidOff) themes.add('sacrifice');
  // `deflection` isn't geometrically detected in this replay — carry it
  // through from the stored motif tag when present.
  if (meta.tacticType === 'deflection') themes.add('deflection');

  // ── Adaptive (auto) — the endgame pool ─────────────────────────
  if (meta.gamePhase === 'endgame') themes.add('endgame');

  return Array.from(themes);
}
