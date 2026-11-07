/**
 * THE QUESTIONS THE STUDENT ASKS FEED WHAT THE COACH TEACHES — ACROSS GAMES
 * (David 2026-11-07: "if no downside to cross game memory, that would be
 * best"; the reversed matrix's need term).
 *
 * A question about a board says the student was not sure what that board was
 * asking. So the skills the board POSED when they asked (`positionPosed` — the
 * same computer the record and the need score read, so one vocabulary in both
 * directions) are remembered, one timestamp per ask, in the one memory store
 * (`studentMemory` kind `asked`). The need score reads them back: a ply that
 * poses a skill the student asked about in their last `ASK_WINDOW_GAMES`
 * games is worth more (`needScore.askedTerm`).
 *
 * The guards, each a downside named before it was built:
 * - IT FADES: only asks since the student's `ASK_WINDOW_GAMES`-th most recent
 *   game count, so a question from long ago stops pushing.
 * - ASKING IS NEVER A MISS: nothing here writes evidence or touches the hold
 *   rate, so a skill never turns red for being asked about, and the question
 *   before the move (the focus dial) never reads it.
 * - ONLY A PERSON'S QUESTION ABOUT THE BOARD: typed or spoken, validated as a
 *   board question (`asksAboutTheBoard`); hints, canned buttons and composed
 *   prompts never reach it.
 */
import { Chess } from 'chess.js';
import { positionPosed } from './moveInsight';
import { remember } from './studentMemory';
import { db } from '../db/schema';
import { emitWeaknessModelChanged } from './weaknessModelEvents';
import { gameDateMs } from '../utils/gameDate';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { GameRecord } from '../types';

/** The asks that count: those since the student's this-many-th most recent game. */
export const ASK_WINDOW_GAMES = 20;

/** The skills the board posed when the student asked about it: the position's
 *  own questions, with the last move (what their move asked) and the engine's
 *  best move (the shot it holds) when the surface has them. */
export function askedTagsAt(fen: string, history: readonly string[], bestUci: string | null): MisconceptionTagId[] {
  let bestSan: string | undefined;
  if (bestUci && bestUci.length >= 4) {
    try {
      bestSan = new Chess(fen).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), ...(bestUci[4] ? { promotion: bestUci[4] } : {}) })?.san;
    } catch { bestSan = undefined; }
  }
  // The last move, when the history reaches this board.
  let lastMove: { fenBefore: string; san: string } | undefined;
  if (history.length > 0) {
    try {
      const c = new Chess();
      for (const san of history.slice(0, -1)) c.move(san);
      const fenBefore = c.fen();
      const m = c.move(history[history.length - 1]);
      if (m && c.fen().split(' ').slice(0, 4).join(' ') === fen.split(' ').slice(0, 4).join(' ')) lastMove = { fenBefore, san: m.san };
    } catch { lastMove = undefined; }
  }
  try {
    return positionPosed(fen, { ...(bestSan ? { bestSan } : {}), ...(lastMove ? { lastMove } : {}) }).map((p) => p.tag);
  } catch {
    return [];
  }
}

/** Remember one ask for each skill. Fail-open: a storage error loses the ask,
 *  never the turn. Returns the skills written. */
export async function rememberAsked(tags: readonly MisconceptionTagId[], now: number = Date.now()): Promise<MisconceptionTagId[]> {
  const written: MisconceptionTagId[] = [];
  for (const tag of new Set(tags)) {
    const row = await remember('asked', tag, (prev) => ({ at: [...(prev?.at ?? []), now] }), now);
    if (row) written.push(tag);
  }
  // The student model changed: the need memo is dropped so the next read has it.
  if (written.length) emitWeaknessModelChanged();
  return written;
}

/** Where the window starts: the date of the student's `ASK_WINDOW_GAMES`-th
 *  most recent game, or 0 (every ask counts) with fewer games than that. */
export function askWindowStart(games: readonly Pick<GameRecord, 'date'>[]): number {
  const dates = games.map((g) => gameDateMs(g.date)).filter((d): d is number => typeof d === 'number').sort((a, b) => b - a);
  return dates.length >= ASK_WINDOW_GAMES ? dates[ASK_WINDOW_GAMES - 1] : 0;
}

/** How many times the student asked about each skill since `since`. */
export async function askedCountsSince(since: number): Promise<Map<MisconceptionTagId, number>> {
  const out = new Map<MisconceptionTagId, number>();
  try {
    const rows = await db.studentMemory.where('kind').equals('asked').toArray();
    for (const r of rows) {
      const at = (r.data as { at?: number[] }).at ?? [];
      const n = at.filter((t) => t >= since).length;
      if (n > 0) out.set(r.key as MisconceptionTagId, n);
    }
  } catch { /* fail-open: nothing remembered */ }
  return out;
}
