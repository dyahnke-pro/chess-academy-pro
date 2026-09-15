/**
 * puzzleDifficulty — a COMPUTED rating for a generated puzzle (P6 of the
 * computed-concept engine, docs/plans/2026-09-14-computed-concept-detectors.md).
 *
 * "Master tier is a difficulty filter (≥2400) over ANY source — own games
 * included" (David 2026-09-14). So difficulty must be a property of the
 * POSITION + SOLUTION, computed the same way whatever the game came from.
 * Every feature is board-derived (chess.js + `computePlyFacts`) or comes from
 * the concept the solution teaches; nothing is asked of a model (G0).
 *
 * Features (all measured on the SOLVER's moves of the solution line):
 *   • depth        — how many solver moves the line needs (the biggest driver
 *                    of Lichess difficulty: 1-mover ≈ 1000, 4-mover ≈ 2300).
 *   • quiet first  — the key move is neither a capture, a check nor a
 *                    promotion: the hardest kind of move to find.
 *   • sacrifice    — the key move gives material (the moved piece lands where
 *                    a cheaper piece takes it, or the capture nets less than it
 *                    gives): counter-intuitive, hard.
 *   • all forcing  — every solver move is a check or capture: easy to
 *                    calculate, discount.
 *   • concept      — how "seen" the pattern is: forks/back-rank are beginner
 *                    vocabulary, quiet endgame technique is master vocabulary.
 *   • endgame      — few pieces left: precision, not pattern-spotting.
 *
 * Calibration: `puzzleDifficulty.report.test.ts` (env-gated) scores the
 * estimator against the KNOWN Lichess ratings of `puzzles.json` +
 * `master-puzzles.json` — the same known-answer discipline as every detector.
 */
import { Chess, type Square } from 'chess.js';
import type { ComputedConcept } from './conceptEngine';

const PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Rating points a concept adds on top of the structural features. */
const CONCEPT_WEIGHT: Record<string, number> = {
  // tactics — beginner vocabulary first
  fork: 0, back_rank: 0, pin: 60, skewer: 60, trapped_piece: 120, battery: 120,
  discovery: 160, double_check: 160, removal_of_guard: 220, overload: 240, mate_threat: 120,
  // named mates (mating-patterns ids)
  'back-rank-mate': 0, 'smothered-mate': 120, 'arabian-mate': 180, 'anastasias-mate': 200,
  'hook-mate': 200, 'opera-mate': 160, 'morphys-mate': 220, 'bodens-mate': 240, 'double-bishop-mate': 200,
  'dovetail-mate': 180, 'swallows-tail-mate': 180, 'epaulette-mate': 160, 'damianos-mate': 200,
  'lollis-mate': 200, 'grecos-mate': 200, 'max-langes-mate': 220, 'pillsburys-mate': 220,
  'blackburnes-mate': 260, 'retis-mate': 260, 'legals-mate': 220, 'kill-box-mate': 240,
  'triangle-mate': 200, 'vukovic-mate': 260, 'corner-mate': 200, 'suffocation-mate': 220,
  'balestra-mate': 240, 'anderssens-mate': 200, 'pawn-mate': 160,
  // endgame technique — master vocabulary
  opposition: 300, 'key-squares': 320, 'rule-of-the-square': 220, 'rook-pawn-corner': 260,
  lucena: 380, philidor: 380, 'cut-off-king': 300, 'rook-behind-passer': 280, 'wrong-rook-pawn-bishop': 320,
};
/** Matchup principles (source 'matchup') — an ending with no named technique. */
const MATCHUP_WEIGHT = 260;

export interface DifficultyFeatures {
  solverPlies: number;
  quietFirst: boolean;
  sacrificeFirst: boolean;
  allForcing: boolean;
  endgame: boolean;
  mateIn: number | null;
  conceptId: string | null;
}

export interface DifficultyEstimate {
  rating: number;
  features: DifficultyFeatures;
}

function pieceCount(c: Chess): number {
  let n = 0;
  for (const row of c.board()) for (const cell of row) if (cell && cell.type !== 'k') n += 1;
  return n;
}

/** Cheapest enemy attacker of `sq` after the move, in pawns (Infinity = none). */
function cheapestAttacker(c: Chess, sq: Square, by: 'w' | 'b'): number {
  let best = Infinity;
  for (const from of c.attackers(sq, by)) {
    const p = c.get(from);
    if (p) best = Math.min(best, PTS[p.type] ?? 0);
  }
  return best;
}

/**
 * Features of a solution line from the solver's start position. `uci` are the
 * SOLVER-FIRST moves (the Lichess setup move already applied). Robust: a
 * malformed line yields the zero-feature estimate rather than a throw.
 */
export function difficultyFeatures(fenSolverToMove: string, uci: readonly string[], lead: ComputedConcept | null, mateIn: number | null): DifficultyFeatures {
  let solverPlies = 0;
  let quietFirst = false;
  let sacrificeFirst = false;
  let allForcing = true;
  let endgame = false;
  try {
    const c = new Chess(fenSolverToMove);
    const solver = c.turn();
    endgame = pieceCount(c) <= 10;
    for (let i = 0; i < uci.length; i += 1) {
      const m = c.move({ from: uci[i].slice(0, 2), to: uci[i].slice(2, 4), promotion: uci[i].length > 4 ? uci[i].slice(4) : undefined });
      if (!m) break;
      if (m.color !== solver) continue;
      solverPlies += 1;
      const forcing = !!m.captured || m.san.includes('+') || m.san.includes('#') || !!m.promotion;
      if (!forcing) allForcing = false;
      if (solverPlies === 1) {
        quietFirst = !forcing;
        const moverVal = PTS[m.piece] ?? 0;
        const gained = m.captured ? (PTS[m.captured] ?? 0) : 0;
        const taker = cheapestAttacker(c, m.to, solver === 'w' ? 'b' : 'w');
        // Gives material: lands where a cheaper piece takes it, or takes less
        // than it will lose.
        sacrificeFirst = taker < Infinity && (taker < moverVal) && (gained < moverVal);
      }
    }
  } catch { /* zero features */ }
  return { solverPlies, quietFirst, sacrificeFirst, allForcing: solverPlies > 0 && allForcing, endgame, mateIn, conceptId: lead?.id ?? null };
}

/** The rating for a feature bundle. Clamped to the Lichess range. */
export function ratingFromFeatures(f: DifficultyFeatures, leadSource: ComputedConcept['source'] | null): number {
  let r = 950;
  r += 260 * Math.max(0, f.solverPlies - 1);
  if (f.quietFirst) r += 240;
  if (f.sacrificeFirst) r += 280;
  if (f.allForcing && f.solverPlies <= 2) r -= 120;
  if (f.endgame) r += 140;
  if (f.mateIn !== null) r += f.mateIn <= 1 ? -200 : f.mateIn >= 4 ? 120 : 0;
  if (f.conceptId) r += CONCEPT_WEIGHT[f.conceptId] ?? (leadSource === 'matchup' ? MATCHUP_WEIGHT : 100);
  return Math.round(Math.max(600, Math.min(3000, r)));
}

/** Estimate a puzzle's rating from its solver-to-move position + solution. */
export function estimatePuzzleRating(fenSolverToMove: string, uci: readonly string[], lead: ComputedConcept | null, mateIn: number | null = null): DifficultyEstimate {
  const features = difficultyFeatures(fenSolverToMove, uci, lead, mateIn);
  return { rating: ratingFromFeatures(features, lead?.source ?? null), features };
}

/** The master tier is a DIFFICULTY filter, whatever the source. */
export const MASTER_TIER_RATING = 2400;
