// boardState — two facts about the BOARD that decide whether a claim may be said
// at all, on every coach surface (David 2026-09-25: "Root cause fixes this time").
//
// Hand walks found the same two failures on Learn, then again on review, because
// each surface had grown its own guard: Learn filtered in its page code, review
// had nothing. The rules are properties of the position, not of a surface, so
// they live here and BOTH doors read them — `coachDecider.decide()` (review,
// positionFacts and everything built on it) and Learn's alert lanes.
//
//  1. IN FLUX — a capture just landed and the side to move can take back without
//     losing. A STANDING claim describes a board that will not exist next move:
//     "You're a piece up" after …Bxf3 with Bxf3 coming, "Newly undefended: your
//     bishop on c4" before …dxc4, "their rook on d8 is doing the most work".
//  2. MATE ON THE BOARD — the side to move has a forced mate. Everything else is
//     noise beside it: "convert your extra material" with mate in two, "your
//     bishop on f4 is loose" beside a mate in one.
import { Chess } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { isMateEval } from './engineConstants';
import { FACT_LAYER, type FactKind } from './reviewFacetRank';

export interface BoardState {
  /** A capture just landed on this square and the side to move can take back
   *  without losing material; null otherwise. */
  inFlux: string | null;
  /** A forced mate is on the board for either side (engine mate score), or
   *  the side to move has a mate in one. */
  mateOnBoard: boolean;
}

export const CALM_BOARD: BoardState = { inFlux: null, mateOnBoard: false };

/** The square a capture `san` from `fenBefore` landed on, when the reply can
 *  take back on it without losing; null otherwise. */
export function inFluxAfter(fenBefore: string, san: string): string | null {
  try {
    const c = new Chess(fenBefore);
    const m = c.move(san);
    if (!m.captured) return null;
    const retake = c.moves({ verbose: true }).some((r) => r.to === m.to && r.captured);
    if (!retake) return null;
    return legalSeeGainFor(c.fen(), m.to, c.turn()) >= 0 ? m.to : null;
  } catch { return null; }
}

/** A mate in one for the side to move — read off the board, no engine. */
export function mateInOneOnBoard(fen: string): boolean {
  try {
    const c = new Chess(fen);
    for (const m of c.moves({ verbose: true })) {
      if (!m.san.endsWith('#')) continue;
      return true;
    }
    return false;
  } catch { return false; }
}

/** The board state after `san` was played from `fenBefore`. `evalWhitePov` is
 *  the engine's number for the position after (a mate sentinel when forced);
 *  pass null when there is none and the board alone decides. */
export function boardStateAfter(fenBefore: string, san: string, fenAfter: string, evalWhitePov: number | null): BoardState {
  // A forced mate for EITHER side: the side not to move with an unstoppable
  // mate is just as decided ("You're a piece up — trade pieces" after Bf4+
  // with mate coming, review tape 2026-09-25).
  const engineMate = evalWhitePov !== null && isMateEval(evalWhitePov);
  return {
    inFlux: inFluxAfter(fenBefore, san),
    mateOnBoard: engineMate || mateInOneOnBoard(fenAfter),
  };
}

/** Kinds that state a STANDING fact — material, structure, a piece's standing,
 *  a plan. True of the board as it stands, so false of a board in flux. */
const STANDING: ReadonlySet<FactKind> = new Set<FactKind>([
  'loose', 'count', 'technique', 'stock', 'verdict', 'eval', 'status', 'convert',
  'opp-target', 'worst', 'badbishop', 'complex', 'structure', 'passer', 'minority',
  'rook7', 'plan-now', 'plan-race', 'plan-middlegame', 'plan-opening', 'plan-line',
  'structure-plan', 'student-leans', 'opponent-leans', 'latent-danger', 'latent-chance',
  'opp-dev', 'king', 'endgame',
]);

/** Beside a mate, what may still speak: the mate itself and the verdict on the
 *  move that allowed or found it. */
const BESIDE_MATE: ReadonlySet<FactKind> = new Set<FactKind>([
  'tactic', 'forced', 'move', 'quality', 'praise', 'key-moment', 'deliberation', 'concept',
  'refuted', 'sac', 'sac-why',
]);

/** What may still be said ABOUT the square in flux: the verdict on the move
 *  that captured, and the exchange itself. Everything else about that piece —
 *  what it pins, eyes, threatens — describes a piece about to be taken
 *  ("their queen on e1 pins your bishop" one move before Rxe1). */
const ABOUT_THE_FLUX_SQUARE: ReadonlySet<FactKind> = new Set<FactKind>([
  'quality', 'praise', 'move', 'forced', 'refuted', 'deliberation', 'key-moment',
  'method', 'sac', 'sac-why', 'timing', 'trade',
  // The principle the move just played follows — about the MOVE, like its
  // verdict ("d4 opens up the center" stays true after …exd4).
  'rule',
]);

export type BoardVeto = 'in-flux' | 'beside-mate';

/** Why the board forbids this claim here, or null when it may be said. A fact
 *  of unknown kind is never vetoed — silence must never be a guess. `squares`
 *  are the ones the fact is about, coupled at emission (never scraped). */
export function boardVeto(kind: FactKind | null, state: BoardState, squares?: readonly string[]): BoardVeto | null {
  if (kind === null) return null;
  if (state.mateOnBoard && !BESIDE_MATE.has(kind)) return 'beside-mate';
  if (state.inFlux && STANDING.has(kind)) return 'in-flux';
  if (state.inFlux && squares?.includes(state.inFlux) && !ABOUT_THE_FLUX_SQUARE.has(kind)) return 'in-flux';
  return null;
}

/** Every kind is either standing or not, and either allowed beside a mate or not
 *  — asserted in tests over `FACT_LAYER`'s keys, so a new kind is decided. */
export const ALL_FACT_KINDS = Object.keys(FACT_LAYER) as FactKind[];
