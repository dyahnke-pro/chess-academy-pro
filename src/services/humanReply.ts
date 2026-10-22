/**
 * humanReply — THE ONE WAY A STRENGTH-LIMITED OPPONENT CHOOSES A MOVE, on every
 * surface (David 2026-10-22: "make more human … Check to make sure this is an
 * app wide fix. Even the play in opening tab").
 *
 * Every opponent that plays at a rating — Learn and the Campaign, Play, the
 * Openings Play tab, a mistake puzzle played on, an endgame play-out — asks
 * here once it is past the book. One read scores every legal move, and the
 * fitted human model (`humanMove`) picks among them for the target rating. If
 * the read fails, the engine's own Elo cap answers, as before — logged, so a
 * device that never gets the human move is visible.
 *
 * A full-strength demo never comes here; it wants the best move, not a human
 * one.
 */
import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { pickHumanMove, type HumanPick, type ScoredMove } from './humanMove';
import type { StockfishAnalysis } from '../types';

/** One wide read's time — the same the coach's old capped search took, so a
 *  reply is no slower: 1.2 s on the threaded build, 2.5 s single-threaded
 *  (the iPhone's engines). */
const HUMAN_READ_MS = 1200;
const HUMAN_READ_SINGLE_THREAD_MS = 2500;
export function humanReadBudget(): number {
  const threaded = typeof SharedArrayBuffer !== 'undefined' && (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  return threaded ? HUMAN_READ_MS : HUMAN_READ_SINGLE_THREAD_MS;
}
/** The read's nominal depth (the model was fitted on depth-10 reads). */
const HUMAN_READ_DEPTH = 10;

/** A move's score from the side to move, a mate folded the way the model was
 *  fitted (±2000, faster mates higher). */
export function foldScore(cp: number, mate: number | null): number {
  if (mate === null) return cp;
  const n = Math.min(99, Math.abs(mate));
  return Math.sign(mate || 1) * (2000 + (100 - n));
}

export interface HeldEngine {
  analyzePosition(fen: string, depth: number, options?: Record<string, string | number>, budgetMs?: number): Promise<StockfishAnalysis>;
}

/** Every legal move's score from the side to move, from ONE read by an
 *  engine the caller already holds. MultiPV is widened for the read and put
 *  back. A move the read reports twice (lines reshuffle between depths) keeps
 *  its deeper score; a move it never reached is left out. */
export async function scoreEveryMove(engine: HeldEngine, fen: string, budgetMs: number, depth: number = HUMAN_READ_DEPTH): Promise<Array<ScoredMove & { mate: number | null; pv: string[] }> | null> {
  let legal = 0;
  try { legal = new Chess(fen).moves().length; } catch { return null; }
  if (legal === 0) return null;
  const moverWhite = fen.split(' ')[1] === 'w';
  try {
    try { stockfishEngine.setMultiPv(legal); } catch { /* not ready → the default lines */ }
    const read = await engine.analyzePosition(fen, depth, undefined, budgetMs).catch(() => null);
    if (!read || read.topLines.length === 0) return null;
    const best = new Map<string, { d: number; cp: number; mate: number | null; pv: string[] }>();
    for (const l of read.topLines) {
      const uci = l.moves[0];
      if (!uci) continue;
      const d = l.depth ?? 0;
      const held = best.get(uci);
      if (held && held.d > d) continue;
      // The engine reports White's view; the model reads the mover's.
      const sign = moverWhite ? 1 : -1;
      const mate = l.mate === null ? null : l.mate * sign;
      best.set(uci, { d, cp: l.evaluation * sign, mate, pv: l.moves });
    }
    return [...best.entries()].map(([uci, v]) => ({ uci, cp: foldScore(v.cp, v.mate), mate: v.mate, pv: v.pv }));
  } finally {
    try { stockfishEngine.setMultiPv(3); } catch { /* ignore */ }
  }
}

export interface HumanReply extends HumanPick {
  source: 'human';
}

/** The human move for this board at `targetElo`, or null when the engine
 *  could not score the moves (the caller falls back to its capped search). */
export async function humanReply(fen: string, targetElo: number, budgetMs: number = humanReadBudget()): Promise<HumanReply | null> {
  if (targetElo > HUMAN_TOP_RATING) return null;
  const scored = await stockfishEngine.holdForQuestion((engine) => scoreEveryMove(engine, fen, budgetMs)).catch(() => null);
  if (!scored || scored.length === 0) return null;
  const pick = pickHumanMove(fen, scored, targetElo);
  return pick ? { ...pick, source: 'human' } : null;
}

/** The ratings the model was fitted on; above them the capped engine plays
 *  (a 2600+ opponent is asked for its best, not for a human's). */
export const HUMAN_TOP_RATING = 2600;

export interface RatedMoveConfig {
  targetElo: number;
  /** The capped engine's think time, when it answers instead. */
  moveTimeMs: number;
  /** Its Skill Level, for an engine with no Elo cap. */
  skill: number;
}

export interface RatedMove {
  uci: string;
  /** `human`: the fitted model chose; `engine-capped`: the engine's own Elo
   *  cap did (the read failed, or the target is above the model's range). */
  source: 'human' | 'engine-capped';
  human: HumanReply | null;
}

/** A move at a rating, on every surface that plays one past the book: the
 *  human move, or — when it cannot be had — the engine at its Elo cap. Null
 *  only when neither answered. */
export async function ratedMove(fen: string, config: RatedMoveConfig): Promise<RatedMove | null> {
  if (config.targetElo <= HUMAN_TOP_RATING) {
    const human = await humanReply(fen, config.targetElo).catch(() => null);
    if (human) return { uci: human.uci, source: 'human', human };
  }
  const uci = await stockfishEngine.getBestMove(fen, config.moveTimeMs, config.skill, config.targetElo);
  return uci && uci.length >= 4 && uci !== '(none)' ? { uci, source: 'engine-capped', human: null } : null;
}
