// principleDetector — cheap, deterministic checks for classical opening/
// middlegame PRINCIPLE violations (the "principle-then-exception" leg of the
// think-aloud build, docs/plans/2026-07-11-danya-style-remaining.md #20).
//
// Two uses, both computed (G0):
//   • the STUDENT's last move violated a principle AND lost eval → the
//     principle names the lesson ("the rule you crossed is…");
//   • the ENGINE's preferred continuation itself violates one → the
//     Danya-signature exception beat ("the rule says develop — here the
//     concrete line overrides it").
//
// Checks are heuristic by design — square-anchored, chess.js-verified state,
// no engine required. Empty result > speculative result.

import { Chess, type Color, type Square } from 'chess.js';

export interface PrincipleViolation {
  /** Stable id — concept-corpus adjacent tag. */
  id:
    | 'early-queen-sortie'
    | 'same-piece-twice'
    | 'wing-pawn-grab-uncastled'
    | 'knights-before-bishops'
    | 'early-edge-pawns';
  /** The classical rule, phrased as timeless teaching. */
  principle: string;
  /** The concrete, square-anchored observation on THIS board. */
  observed: string;
}

const MINOR_HOMES: Record<Color, Square[]> = {
  w: ['b1', 'g1', 'c1', 'f1'],
  b: ['b8', 'g8', 'c8', 'f8'],
};

function developedMinorCount(chess: Chess, color: Color): number {
  let developed = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue;
      if (cell.type !== 'n' && cell.type !== 'b') continue;
      if (!MINOR_HOMES[color].includes(cell.square)) developed += 1;
    }
  }
  return developed;
}

/** Replay `historySans` and report principle violations committed by the
 *  LAST move (mover = the side that played it). Opening scope: the checks
 *  only fire in the first ~12 moves — past that the "rules" stop being the
 *  frame. Returns [] on any replay problem (never guesses). */
export function detectPrincipleViolations(historySans: string[]): PrincipleViolation[] {
  if (historySans.length === 0 || historySans.length > 24) return [];
  const chess = new Chess();
  const moves: Array<{ san: string; from: Square; to: Square; piece: string; color: Color; captured?: string }> = [];
  try {
    for (const san of historySans) {
      const m = chess.move(san);
      if (!m) return [];
      moves.push({ san: m.san, from: m.from, to: m.to, piece: m.piece, color: m.color, captured: m.captured });
    }
  } catch {
    return [];
  }
  const last = moves[moves.length - 1];
  const mover = last.color;
  const out: PrincipleViolation[] = [];
  const developed = developedMinorCount(chess, mover);
  const kingSideHome = mover === 'w' ? 'e1' : 'e8';
  const kingHome = chess.board().flat().some(
    (c) => c && c.type === 'k' && c.color === mover && c.square === kingSideHome,
  );

  // 1. Early queen sortie — the queen leaves the back rank before 3 minors
  //    are out. (A queen CAPTURE that wins material is exempted upstream by
  //    the eval condition; here we only report the structural fact.)
  if (last.piece === 'q' && developed < 3) {
    const backRank = mover === 'w' ? '1' : '8';
    if (!last.to.endsWith(backRank)) {
      out.push({
        id: 'early-queen-sortie',
        principle: 'Develop the minor pieces before the queen — an early queen becomes a target and loses time to threats.',
        observed: `The queen came out to ${last.to} with only ${developed} minor piece${developed === 1 ? '' : 's'} developed.`,
      });
    }
  }

  // 2. Same piece moved twice in the opening while others sit at home.
  if (last.piece !== 'p' && last.piece !== 'k' && developed <= 2 && !last.captured) {
    const moverMoves = moves.filter((m) => m.color === mover);
    const priorSamePiece = moverMoves.slice(0, -1).filter((m) => m.to === last.from && m.piece === last.piece);
    if (priorSamePiece.length > 0) {
      out.push({
        id: 'same-piece-twice',
        principle: 'In the opening, every move should bring a NEW piece into the game — moving the same piece twice hands back the tempo.',
        observed: `The ${last.piece === 'n' ? 'knight' : last.piece === 'b' ? 'bishop' : 'piece'} moved again (${last.san}) while other pieces sit on their starting squares.`,
      });
    }
  }

  // 3. Wing-pawn grab with an uncastled king.
  if (last.captured === 'p' && kingHome) {
    const file = last.to[0];
    if (file === 'a' || file === 'b' || file === 'g' || file === 'h') {
      out.push({
        id: 'wing-pawn-grab-uncastled',
        principle: 'Grabbing wing pawns before the king is safe trades development and king safety for a pawn — the classic poisoned bite.',
        observed: `Captured the ${last.to} pawn while the king still sits on ${kingSideHome}.`,
      });
    }
  }

  // 4. Bishops committed before any knight (knights-before-bishops inversion).
  if (last.piece === 'b' && historySans.length <= 10 && !last.captured) {
    const chessProbe = new Chess();
    // Count the mover's knight developments before this move.
    let knightMoves = 0;
    for (const m of moves.slice(0, -1)) {
      if (m.color === mover && m.piece === 'n') knightMoves += 1;
      void chessProbe;
    }
    const moverBishopMoves = moves.filter((m) => m.color === mover && m.piece === 'b').length;
    if (knightMoves === 0 && moverBishopMoves >= 2) {
      out.push({
        id: 'knights-before-bishops',
        principle: 'Knights usually declare their best squares before bishops do — committing both bishops first gives the opponent a target to play around.',
        observed: 'Both bishops committed before a single knight developed.',
      });
    }
  }

  // 5. Early edge-pawn pushes with the center unresolved.
  if (last.piece === 'p' && (last.to[0] === 'a' || last.to[0] === 'h') && !last.captured && historySans.length <= 12) {
    const centerPawns = ['d4', 'e4', 'd5', 'e5'].filter((sq) => {
      const p = chess.get(sq as Square);
      return p && p.type === 'p';
    }).length;
    if (centerPawns <= 1 && developed < 3) {
      out.push({
        id: 'early-edge-pawns',
        principle: 'Edge pawns rarely fight for anything early — the center is unresolved and every tempo belongs there.',
        observed: `The ${last.to[0]}-pawn advanced (${last.san}) with the center still unclaimed and pieces at home.`,
      });
    }
  }

  return out;
}
