/**
 * modelGameMatcher — Phase 2 of the Danya review build: find THE model-game
 * cameo for a review position, or none.
 *
 * Danya's cameo is RARE (one per review, never more), NAMED (players, year,
 * event), enters at the THEMATIC moment, and the comparison is geometric —
 * the shared feature is verified on BOTH boards, never vibes. This service
 * is the computed half of that contract (G0): it scores every
 * model-games.json criticalMoment against the review position's
 * structureSignature and returns the single best match over a HARD floor —
 * below the floor there is NO cameo (empty > tenuous, R7).
 *
 * Probe-calibrated 2026-07-18 (docs/plans/2026-07-18-danya-review-build.md
 * §2.1): IQP middlegames surface IQP moments, opposite-wing races surface
 * the race games, the QGD Carlsbad surfaces Fischer–Spassky Reykjavik G6,
 * French chains surface "undermine the chain" moments, and an R+B ending
 * with no matching conversion moment in the corpus surfaces NOTHING.
 */
import modelGamesJson from '../data/model-games.json';
import {
  structureSignature,
  structureMatchDetail,
  type StructureSignature,
} from './boardStructure';

interface RawCriticalMoment {
  moveNumber?: number;
  color?: string;
  fen?: string;
  annotation?: string;
  concept?: string;
}

interface RawModelGame {
  id?: string;
  openingId?: string;
  white?: string;
  black?: string;
  year?: number | null;
  event?: string | null;
  result?: string | null;
  pgn?: string;
  middlegameTheme?: string | null;
  criticalMoments?: RawCriticalMoment[];
}

export interface ModelGameCameo {
  gameId: string;
  openingId: string;
  white: string;
  black: string;
  year: number | null;
  event: string | null;
  result: string | null;
  pgn: string;
  /** The thematic moment the cameo jumps to (never move 1). */
  momentFen: string;
  momentMoveNumber: number;
  momentConcept: string | null;
  /** Match evidence. */
  matched: number;
  weight: number;
  ratio: number;
  /** Geometric tie-back facts, each verified TRUE on BOTH boards —
   *  the only things the voice may cite about the comparison. */
  sharedFeatures: string[];
}

/** Hard floor (probe-calibrated): enough ACTUAL shared evidence, and most
 *  of what participated agreed. */
const FLOOR_MATCHED = 4;
const FLOOR_RATIO = 0.6;

function familyAffinity(reviewFamily: string | null, gameOpeningId: string): number {
  if (!reviewFamily || !gameOpeningId) return 0;
  if (gameOpeningId === reviewFamily) return 1;
  const a = reviewFamily.split('-')[0];
  const b = gameOpeningId.split('-')[0];
  return a === b ? 0.5 : 0;
}

/** Named-players proxy: a real "Firstname Lastname" on both sides reads as
 *  a citable classic; bare usernames don't carry the same cameo weight. */
function namedPlayersBonus(g: RawModelGame): number {
  const named = (s: string | undefined): boolean => !!s && s.trim().includes(' ');
  return named(g.white) && named(g.black) ? 0.05 : 0;
}

/** The shared-feature tie-back lines, computed strictly from the feature
 *  classes that MATCHED on both signatures (G0 — the voice cites only
 *  these). */
export function sharedFeatureLines(a: StructureSignature, b: StructureSignature): string[] {
  const out: string[] = [];
  const sharedOutposts = a.outpostSquares.filter((sq) => b.outpostSquares.includes(sq));
  if (sharedOutposts.length > 0) {
    out.push(`the same ${sharedOutposts.join(' and ')} outpost`);
  } else if (a.outpostSquares.length > 0 && b.outpostSquares.length > 0) {
    out.push('a protected outpost in both positions');
  }
  if (a.oppositeWings && b.oppositeWings) {
    out.push('kings castled on opposite wings in both games');
  }
  if (a.iqp && b.iqp) {
    out.push('an isolated queen’s pawn in both positions');
  }
  if (a.lockedCenter && b.lockedCenter) {
    out.push('the same locked central pawn chain');
  }
  if (a.queensideMajority !== null && a.queensideMajority === b.queensideMajority) {
    const side = a.queensideMajority === 'w' ? 'White' : 'Black';
    out.push(`${side} holding the queenside pawn majority in both`);
  }
  const sharedOpen = a.openFiles.filter((f) => b.openFiles.includes(f));
  if (sharedOpen.length > 0) {
    out.push(`the open ${sharedOpen.join('- and ')}-file in both positions`);
  }
  if (a.doubled && b.doubled) {
    out.push('doubled pawns in both positions');
  }
  if (a.passedPawnCount > 0 && b.passedPawnCount > 0) {
    out.push('a passed pawn in both positions');
  }
  if (a.endgameType !== null && a.endgameType === b.endgameType) {
    out.push(`the same ${a.endgameType} endgame`);
  }
  return out;
}

/**
 * The Phase-2 entry point: the single best model-game cameo for a review
 * position, or null when nothing clears the floor. ONE cameo max — the
 * caller never gets a list to be tempted by.
 */
export function matchModelGameCameo(
  fen: string,
  opts: { openingFamily?: string | null } = {},
): ModelGameCameo | null {
  const reviewSig = structureSignature(fen);
  if (!reviewSig) return null;

  const games = modelGamesJson as RawModelGame[];
  let best: ModelGameCameo | null = null;
  let bestScore = -Infinity;

  for (const g of games) {
    if (!g.id || !g.white || !g.black || !g.pgn) continue;
    for (const m of g.criticalMoments ?? []) {
      if (!m.fen || typeof m.moveNumber !== 'number' || m.moveNumber <= 1) continue;
      const momentSig = structureSignature(m.fen);
      if (!momentSig) continue;
      const d = structureMatchDetail(reviewSig, momentSig);
      if (d.weight <= 0) continue;
      const ratio = d.score / d.weight;
      if (d.score < FLOOR_MATCHED || ratio < FLOOR_RATIO) continue;
      const score =
        ratio +
        familyAffinity(opts.openingFamily ?? null, g.openingId ?? '') * 0.15 +
        namedPlayersBonus(g);
      if (score <= bestScore) continue;
      const shared = sharedFeatureLines(reviewSig, momentSig);
      if (shared.length === 0) continue; // nothing citable → nothing to teach
      bestScore = score;
      best = {
        gameId: g.id,
        openingId: g.openingId ?? '',
        white: g.white,
        black: g.black,
        year: g.year ?? null,
        event: g.event ?? null,
        result: g.result ?? null,
        pgn: g.pgn,
        momentFen: m.fen,
        momentMoveNumber: m.moveNumber,
        momentConcept: m.concept ?? null,
        matched: d.score,
        weight: d.weight,
        ratio,
        sharedFeatures: shared,
      };
    }
  }
  return best;
}
