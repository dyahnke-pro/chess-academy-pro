/**
 * THE COACH'S MOVE SCORERS — the ONE place a card's dials or a boss re-rank
 * the coach's candidate moves (WO-CAMPAIGN-MASTER, Phase 0).
 *
 * A scorer says how much it LIKES a candidate, in [-1, 1]; a weight says how
 * much that liking counts. `scoreCandidates` ranks only the candidates inside
 * the coach's acceptable-move window — the moves its level would play anyway —
 * so no scorer can ever make the coach play below its level. Ties keep the
 * engine's order (cheapest first).
 *
 * Scorers live in their owners' files under `src/missions/scorers/` and
 * register themselves; `scorers/index.ts` loads every file in that folder, so
 * adding one needs no edit here. A scorer's id is a key of `ScorerIdMap`,
 * extended by module augmentation from the scorer's own file:
 *
 *   declare module '../moveScoring' { interface ScorerIdMap { greed: true } }
 *
 * With every weight zero (every card before the Campaign master WO) nothing
 * is read and nothing is re-ranked.
 */
import type { BossId, CoachDials, MissionPhase, PatternId } from './missionCard';
import type { FocusId } from '../coach/focus/focusCard';
import type { MotifLevel } from '../data/tacticMotifs';

/** Every scorer. The dial-driven ones are declared here; others by their owners. */
export interface ScorerIdMap {
  /** Equal trades inside the window (the `trades` dial). */
  trades: true;
  /** Moves toward the card's `pattern` (the `steer` dial). */
  steer: true;
}
export type ScorerId = keyof ScorerIdMap;

export interface ScoringCandidate {
  uci: string;
  /** What the move costs the coach against its best, centipawns, ≥ 0. */
  cpLoss: number;
}

export interface ScoringContext {
  /** The board, coach to move. */
  fen: string;
  coach: 'w' | 'b';
  /** The most a candidate may cost and still be played (the level's window). */
  windowCp: number;
  /** The coach's standing before the move, its point of view, when known. */
  coachEvalCp: number | null;
  /** The live card's pattern, for the steer scorer. */
  pattern: PatternId | null;
  /** The live card's phase. */
  phase: MissionPhase | null;
  bossId: BossId | null;
  /** A boss's targets: the patterns of the student's weakest taught habits
   *  (`weakness.ts`), which its `targets` scorer steers toward. Empty off a boss. */
  targets: readonly PatternId[];
  /** A Learn focus game's focus (WO-LEARN-FOCUS-01) and the student's open
   *  motif levels (WO-MOTIFS-01), for the `focus` scorer. Null off a focus
   *  game. */
  focus: { id: FocusId; levels: ReadonlySet<MotifLevel> } | null;
}

/** Pure: how much this scorer likes the candidate, clamped to [-1, 1]. */
export type Scorer = (candidate: ScoringCandidate, ctx: ScoringContext) => number;

export type ScorerWeights = Partial<Record<ScorerId, number>>;

const SCORERS = new Map<ScorerId, Scorer>();

/** Register a scorer once, from its owner's module. A second registration of
 *  the same id is a wiring bug and throws. */
export function registerScorer(id: ScorerId, fn: Scorer): void {
  if (SCORERS.has(id)) throw new Error(`moveScoring: scorer "${id}" registered twice`);
  SCORERS.set(id, fn);
}

/** Test-only: forget every registration. */
export function resetScorersForTest(): void {
  SCORERS.clear();
}

/** The weights a card's dials ask for. */
export function weightsForDials(dials: CoachDials): ScorerWeights {
  const w: ScorerWeights = {};
  if (dials.trades === 'eager') w.trades = 1;
  if (dials.trades === 'reluctant') w.trades = -1;
  if (dials.steer === 'weak') w.steer = 0.5;
  if (dials.steer === 'strong') w.steer = 1;
  return w;
}

/** Does any weight point at a registered scorer? (No read is spent otherwise.) */
export function hasActiveWeights(weights: ScorerWeights): boolean {
  return (Object.entries(weights) as [ScorerId, number][]).some(([id, w]) => w !== 0 && SCORERS.has(id));
}

export interface ScoredCandidate extends ScoringCandidate {
  score: number;
}

/** The candidates inside the window, best-liked first (ties: cheapest, then
 *  the order given). A weighted scorer that is not registered counts zero. */
export function scoreCandidates(
  candidates: readonly ScoringCandidate[],
  ctx: ScoringContext,
  weights: ScorerWeights,
): ScoredCandidate[] {
  const active = (Object.entries(weights) as [ScorerId, number][])
    .filter(([id, w]) => w !== 0 && SCORERS.has(id))
    .map(([id, w]) => [SCORERS.get(id) as Scorer, w] as const);
  return candidates
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.cpLoss <= ctx.windowCp)
    .map(({ c, i }) => ({
      i,
      scored: { ...c, score: active.reduce((sum, [fn, w]) => sum + w * Math.max(-1, Math.min(1, fn(c, ctx))), 0) },
    }))
    .sort((a, b) => b.scored.score - a.scored.score || a.scored.cpLoss - b.scored.cpLoss || a.i - b.i)
    .map(({ scored }) => scored);
}
