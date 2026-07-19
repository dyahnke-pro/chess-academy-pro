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
import { Chess } from 'chess.js';
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

/** A cameo must be able to PLAY forward from its moment — Danya never
 *  shows a frozen diagram. Moments at the very end of their pgn are out. */
const MIN_TAIL_PLIES = 4;
const MAX_PLAYBACK_PLIES = 8;

/** Piece placement + side to move — the identity we match replayed
 *  positions on (clock/castling fields drift across sources). */
function truncFen(fen: string): string {
  return fen.split(' ').slice(0, 2).join(' ');
}

/** Moment signatures are static data — compute once. */
const momentSigCache = new Map<string, StructureSignature | null>();
function momentSig(fen: string): StructureSignature | null {
  let sig = momentSigCache.get(fen);
  if (sig === undefined) {
    sig = structureSignature(fen);
    momentSigCache.set(fen, sig);
  }
  return sig;
}

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

export interface CameoPlayback {
  /** Board position at the thematic moment (full FEN from replay). */
  startFen: string;
  /** The stretch to play, from the moment forward. */
  plies: Array<{ san: string; fenAfter: string }>;
}

/** Replay the cameo game's pgn, locate the thematic moment, and return the
 *  playable stretch. Null when the moment can't be reached or the tail is
 *  too short — an unplayable cameo is no cameo (G3: every shown move comes
 *  from the real game's replay, chess.js-verified). */
export function buildCameoPlayback(
  cameo: Pick<ModelGameCameo, 'pgn' | 'momentFen'>,
  maxPlies = MAX_PLAYBACK_PLIES,
): CameoPlayback | null {
  const chess = new Chess();
  const target = truncFen(cameo.momentFen);
  const tail: Array<{ san: string; fenAfter: string }> = [];
  let startFen: string | null = truncFen(chess.fen()) === target ? chess.fen() : null;
  for (const tok of cameo.pgn.split(/\s+/)) {
    if (!tok || /^\d+\.(\.\.)?$/.test(tok) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) continue;
    let san: string;
    try {
      san = chess.move(tok).san;
    } catch {
      break; // trailing junk / unparseable tail — stop at the last legal ply
    }
    if (startFen !== null) {
      tail.push({ san, fenAfter: chess.fen() });
      if (tail.length >= maxPlies) break;
    } else if (truncFen(chess.fen()) === target) {
      startFen = chess.fen();
    }
  }
  if (startFen === null || tail.length < MIN_TAIL_PLIES) return null;
  return { startFen, plies: tail };
}

/**
 * The Phase-2 entry point: the single best model-game cameo for a review
 * position, or null when nothing clears the floor. ONE cameo max — the
 * caller never gets a list to be tempted by. Every returned cameo is
 * verified PLAYABLE (its moment is reachable in its pgn with a real tail).
 */
export function matchModelGameCameo(
  fen: string,
  opts: { openingFamily?: string | null } = {},
): ModelGameCameo | null {
  const reviewSig = structureSignature(fen);
  if (!reviewSig) return null;

  const games = modelGamesJson as RawModelGame[];
  const candidates: Array<{ score: number; cameo: ModelGameCameo }> = [];

  for (const g of games) {
    if (!g.id || !g.white || !g.black || !g.pgn) continue;
    for (const m of g.criticalMoments ?? []) {
      if (!m.fen || typeof m.moveNumber !== 'number' || m.moveNumber <= 1) continue;
      const msig = momentSig(m.fen);
      if (!msig) continue;
      const d = structureMatchDetail(reviewSig, msig);
      if (d.weight <= 0) continue;
      const ratio = d.score / d.weight;
      if (d.score < FLOOR_MATCHED || ratio < FLOOR_RATIO) continue;
      const shared = sharedFeatureLines(reviewSig, msig);
      if (shared.length === 0) continue; // nothing citable → nothing to teach
      const score =
        ratio +
        familyAffinity(opts.openingFamily ?? null, g.openingId ?? '') * 0.15 +
        namedPlayersBonus(g);
      candidates.push({
        score,
        cameo: {
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
        },
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    if (buildCameoPlayback(c.cameo) !== null) return c.cameo;
  }
  return null;
}

export interface CameoAnchor {
  /** Index into the fens array (0 = starting position) — the ply whose
   *  position the cameo thematically matches. */
  plyIndex: number;
  cameo: ModelGameCameo;
}

/** Earliest ply from which structures are formed enough to compare. */
const ANCHOR_MIN_PLY = 10;

/**
 * Scan the student game's positions for THE moment to cameo at: the ply
 * where the structural match against the corpus peaks (earliest on ties —
 * Danya speaks when the theme becomes visible, not after it fades).
 * ONE anchor per game, or none.
 */
export function pickCameoAnchor(
  fens: string[],
  opts: { openingFamily?: string | null } = {},
): CameoAnchor | null {
  let best: CameoAnchor | null = null;
  let bestKey = -Infinity;
  for (let i = ANCHOR_MIN_PLY; i < fens.length; i++) {
    const cameo = matchModelGameCameo(fens[i], opts);
    if (!cameo) continue;
    const key = cameo.ratio + cameo.matched * 0.01; // ratio first, evidence tiebreak
    if (key > bestKey) {
      bestKey = key;
      best = { plyIndex: i, cameo };
    }
  }
  return best;
}
