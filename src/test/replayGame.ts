// REPLAY A REAL GAME WITH ITS CACHED ENGINE READS (WO-STORY-MATRIX-01 P1-0).
// A game fixture carries its moves and, per ply, the engine's two reads the
// Danya bench takes (`scripts/bench/danya-reads.mjs`): the board the move was
// played on (MultiPV 5) and the board after it (MultiPV 3), White's view, a
// mate kept as its distance. So a test walks the game the way the app does —
// the lesson's line, Review's walk, the live composer — with no engine.
//
// One reader for the measure (`shortGame.measure.test.ts`), the decision
// baseline (`decisionRows.baseline.test.ts`) and the Danya bench's read
// helpers (`danyaBench.measure.test.ts`), so none of them reads an engine read
// two ways.
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import type { KnownSlipIndex } from '../services/knownSlips';
import { mateEvalFor } from '../services/engineConstants';
import { captureContextsAlong } from '../services/pvPlayback';
import type { PrevCaptureContext } from '../services/captureRun';
import { BRIEFING_LINE_PLIES, newLessonVoice } from '../services/reviewMoveBriefing';
import { lessonThought } from '../services/moveThoughtFacts';
import { buildReviewSegmentsForTests, type ReviewMoveInput, type ReviewMoveSegment } from '../services/coachFeatureService';
import { classifyCpLoss } from '../services/gameAnalysisService';
import { leadingBookPlies } from '../services/bookDeparture';
import type { StoryStore } from '../services/gameStory';
import { setOpeningIdentity } from '../services/openingIdentity';
import { setOpeningPositions } from '../services/openingPositions';
import { setKnownSlipIndexForTests } from '../services/knownSlips';
import { __setLocalDbForTests } from '../services/masterPlayLookup';

/** THE OPENING DATA THE APP LOADS (2026-11-12): the identity file and the
 *  masters database are fetched by the app at start; a replay without them
 *  narrated every opening with no name, no plan and no masters' move, so the
 *  baselines under-reported opening teaching. Every replay loads them. */
setOpeningIdentity(JSON.parse(readFileSync(join(process.cwd(), 'public/data/opening-identity.json'), 'utf8')) as Parameters<typeof setOpeningIdentity>[0]);
setOpeningPositions(JSON.parse(readFileSync(join(process.cwd(), 'public/data/opening-positions.json'), 'utf8')) as Record<string, [string, number]>);
setKnownSlipIndexForTests((JSON.parse(readFileSync(join(process.cwd(), 'public/data/club-gems.json'), 'utf8')) as { boards: Record<string, never[]> }).boards);
__setLocalDbForTests(JSON.parse(readFileSync(join(process.cwd(), 'public/data/openings-masters-db.json'), 'utf8')) as Parameters<typeof __setLocalDbForTests>[0]);

export interface EngineRead { uci: string; cp: number | null; mate: number | null; pv: string[] }
/** The two reads of one ply; `after` is empty when the move ended the game. */
export interface PlyReads { ply: number; before: EngineRead[]; after: EngineRead[] }
export interface ReplayGame {
  sans: string[];
  studentSide: 'white' | 'black';
  reads: PlyReads[];
}

export interface ReplayPly {
  /** 1-based, as Review numbers its moves. */
  ply: number;
  san: string;
  fenBefore: string;
  fenAfter: string;
  mover: 'w' | 'b';
  /** The student played it. */
  own: boolean;
  /** The moves before this one. */
  history: string[];
  /** The capture run this move is read against (a take-back reads as one). */
  prev: PrevCaptureContext;
  /** The other side's move just before, with its board. */
  theirLast: { fenBefore: string; san: string } | null;
  /** The game's own moves after this one, as far as a lesson reads ahead. */
  line: string[];
  before: EngineRead[];
  after: EngineRead[];
  /** The engine's best move before, and its best reply after. */
  best: EngineRead | undefined;
  reply: EngineRead | undefined;
  /** The mover's cost of the move from the two reads (null across a mate). */
  costCp: number | null;
}

/** A read as the app scores it: centipawns, a mate as the mate sentinel. */
export function evalOf(r: EngineRead): number {
  return r.mate !== null ? mateEvalFor(r.mate) : (r.cp ?? 0);
}

export function linesOf(reads: readonly EngineRead[]): AnalysisLine[] {
  return reads.map((r, k) => ({ rank: k + 1, evaluation: evalOf(r), moves: [...r.pv], mate: r.mate }));
}

/** The reads in the shape the live composer takes. */
export function analysisOf(reads: readonly EngineRead[]): StockfishAnalysis {
  const top: EngineRead | undefined = reads.at(0);
  return {
    bestMove: top?.uci ?? '(none)', evaluation: top ? evalOf(top) : 0, isMate: top?.mate != null,
    mateIn: top?.mate ?? null, depth: 14, topLines: linesOf(reads), nodesPerSecond: 0,
  } as StockfishAnalysis;
}

/** The mover's cost of the played move: the best read before minus the read
 *  after, in the mover's view. The Danya bench reads its cost here too, so the
 *  bench, the short game and the decision baseline grade a move one way. */
export function moverCost(mover: 'w' | 'b', best: EngineRead | undefined, reply: EngineRead | undefined): number | null {
  if (!best || !reply) return null;
  const sign = mover === 'w' ? 1 : -1;
  const b = evalOf(best) * sign;
  const p = evalOf(reply) * sign;
  if (Math.abs(b) > 5000 || Math.abs(p) > 5000) return null;
  return Math.max(0, b - p);
}

/** Every ply of the game, with its boards, its context and its reads. */
export function replayPlies(game: ReplayGame): ReplayPly[] {
  const c = new Chess();
  const start = c.fen();
  const runs = captureContextsAlong(start, game.sans);
  const student: 'w' | 'b' = game.studentSide === 'white' ? 'w' : 'b';
  const out: ReplayPly[] = [];
  for (let k = 0; k < game.sans.length; k++) {
    const fenBefore = c.fen();
    const mv = c.move(game.sans[k]);
    const reads = game.reads.find((r) => r.ply === k + 1);
    const before = reads?.before ?? [];
    const after = reads?.after ?? [];
    const best = before.at(0);
    const reply = after.at(0);
    out.push({
      ply: k + 1, san: mv.san, fenBefore, fenAfter: c.fen(), mover: mv.color, own: mv.color === student,
      history: game.sans.slice(0, k), prev: runs[k],
      theirLast: k > 0 ? { fenBefore: out[k - 1].fenBefore, san: out[k - 1].san } : null,
      line: game.sans.slice(k + 1, k + 1 + BRIEFING_LINE_PLIES),
      before, after, best, reply, costCp: moverCost(mv.color, best, reply),
    });
  }
  return out;
}

/** What a lesson says on each move of the game: `lessonThought` with ONE voice
 *  across the game, the generator's own say-once (openingGenerator's DB line). */
export function lessonLines(game: ReplayGame): string[] {
  const voice = newLessonVoice();
  // The game's own reads, as the lesson generator's engine pass reads them:
  // the fan before each move and the read after it.
  return replayPlies(game).map((p) => lessonThought({ theory: true, story: true,
    fenBefore: p.fenBefore, san: p.san, prev: p.prev, moverIsStudent: p.own, line: p.line, theirLast: p.theirLast, history: p.history,
    reads: p.before.length || p.after.length ? { before: linesOf(p.before), after: linesOf(p.after), passBefore: [], passAfter: [] } : null,
    costCp: p.costCp,
  }, voice, null));
}

/** Review's move inputs, graded from the two reads the way the analysis
 *  stores them (the eval after, the best eval before, the best move, the
 *  cost, both lines). The opponent's moves are the other seat. */
export function reviewInputs(game: ReplayGame): ReviewMoveInput[] {
  // THE BOOK, AS THE APP GRADES IT (`gameAnalysisService`): a move inside the
  // game's leading book plies is 'book' unless it is a blunder or better; the
  // replay graded every book move by its cost alone, so 7.h4 (the Tal
  // Variation) was faulted against "develop first" (2026-11-12).
  const bookPlies = leadingBookPlies(game.sans);
  return replayPlies(game).map((p, k) => {
    const white = p.mover === 'w';
    const deliveredMate = /#$/.test(p.san);
    const graded = p.costCp !== null
      ? classifyCpLoss(p.costCp, p.best ? evalOf(p.best) : null, p.reply ? evalOf(p.reply) : null, white, deliveredMate, p.fenBefore, p.san)
      : null;
    const classification = k < bookPlies && (graded === null || graded === 'good' || graded === 'inaccuracy' || graded === 'mistake') ? 'book' : graded;
    return {
      ply: p.ply, san: p.san, isCoachMove: !p.own, classification,
      evaluation: p.reply ? evalOf(p.reply) : null,
      preMoveEval: p.best ? evalOf(p.best) : null,
      bestMove: p.best?.uci ?? null,
      fenAfter: p.fenAfter,
      // Depth 14 clears TRUSTED_LINE_DEPTH, so the walk may rest a claim on them.
      ...(p.best ? { pv: { afterBest: p.best.pv.slice(1), afterPlayed: p.reply?.pv ?? [], depth: 14 }, bestMoveEval: evalOf(p.best) } : {}),
      ...(p.costCp !== null ? { costCp: p.costCp } : {}),
    };
  });
}

let diskSlipIndex: KnownSlipIndex | null = null;
/** The club gem index the app fetches (`/data/club-gems.json`), read off disk
 *  once — the walk reads it as the app does, after `loadKnownSlipIndex`. */
export function knownSlipIndexFromDisk(): KnownSlipIndex {
  diskSlipIndex ??= (JSON.parse(readFileSync(join(process.cwd(), 'public/data/club-gems.json'), 'utf8')) as { boards: KnownSlipIndex }).boards;
  return diskSlipIndex;
}

/** Review's walk over the whole game, one segment a move — in the walk's
 *  default mode (`isReviewUncapped()` is true unless `?uncapped=0`), before the
 *  engine projections the async build adds, with the club gem index in hand. */
export function reviewSegments(game: ReplayGame, rating: number, story?: StoryStore): ReviewMoveSegment[] {
  return buildReviewSegmentsForTests(reviewInputs(game), game.studentSide, null, true, rating, [], undefined, null, new Map(), new Map(), null, story, new Map(), knownSlipIndexFromDisk());
}
