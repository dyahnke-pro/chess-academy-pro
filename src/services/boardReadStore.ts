/**
 * ONE READ PER BOARD, ACROSS GAMES (task #155, 2026-11-09).
 *
 * Learn judged the student's move from whichever live read of the board it
 * happened to have: the next-board read (time-capped at NEXT_BOARD_READ_MS) or
 * the eval bar's. A time-capped search never lands on the same depth twice, so
 * the SAME board in two games got two answers: after 6.h3 the student's …Nc6
 * was "a mistake — Bh5 was the move" in game 1 and "a blunder — Bxf3" in game
 * 2. The verdict store (`moveVerdictStore`) kept the grade but Learn never read
 * it, and the price memo (`playedMoveGrade.PRICE_MEMO`) lived only as long as
 * the page.
 *
 * So the read of a board and the price of a move from it are KEPT on the
 * device, and Learn reads them before it searches:
 *   - `readBoardOnce` — the kept read of a board, or a fresh one that becomes
 *     the kept read. Every Learn reader of a board (the next-board read the
 *     move is graded from, the eval bar's fallback) asks here.
 *   - `keptMovePrice` / `keepMovePrice` — the settled price of a move from a
 *     board, read by `studentMovePrice` before it searches.
 *
 * The rules:
 *   - FIRST FULL READ WINS. A read that reached COACH_TURN_DEPTH with the lines
 *     the turn asks for (six, or every legal move when there are fewer) is
 *     kept and never rewritten. A read cut short of that depth is a DRAFT: it
 *     is kept until a full read of the board replaces it, once, and the draft's
 *     prices go with it (they were priced against its lines).
 *   - A read with fewer lines than the turn asks for is never kept — the eval
 *     bar's three-line read would starve the next game's but-turn, which reads
 *     the seductive move below the top three.
 *   - FAIL-OPEN. A storage error is "nothing kept" and the caller searches as
 *     before.
 *   - Bounded like the explorer's cache: the oldest boards are dropped past
 *     BOARD_READS_KEEP (storage hygiene, never a cap on what is said).
 */
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { COACH_TURN_DEPTH } from './engineConstants';
import { positionOf } from '../utils/samePosition';
import type { StockfishAnalysis } from '../types';
import type { MovePrice } from './moveCost';

/** The lines Learn's next-board read asks for (MultiPV 6). */
export const BOARD_READ_LINES = 6;
/** Boards kept on the device; the oldest go first past this. */
export const BOARD_READS_KEEP = 4000;

export interface BoardReadRecord {
  /** The 4-field position (move counters do not change the read). */
  key: string;
  savedAt: number;
  read: StockfishAnalysis;
  /** Settled prices of moves from this board, by UCI, against `read`. */
  prices: Record<string, MovePrice>;
}

/** The lines a read of this board must carry to be kept. */
function linesWanted(fen: string): number {
  try { return Math.min(BOARD_READ_LINES, new Chess(fen).moves().length); } catch { return BOARD_READ_LINES; }
}

/** A read cut short of the turn's depth: kept only until a full read lands. */
export function isDraftRead(read: Pick<StockfishAnalysis, 'depth'>): boolean {
  return (read.depth ?? 0) < COACH_TURN_DEPTH;
}

/** Can this read of `fen` be kept at all? A mate read always can (its lines
 *  end the game); otherwise it carries the lines the turn asks for. */
function keepable(fen: string, read: StockfishAnalysis): boolean {
  if (!read.bestMove) return false;
  const lines = read.topLines.filter((l) => l.moves.length > 0).length;
  return read.isMate || lines >= linesWanted(fen);
}

/** The kept read of this board, or null. */
export async function keptBoardRead(fen: string): Promise<StockfishAnalysis | null> {
  try { return (await db.boardReads.get(positionOf(fen)))?.read ?? null; } catch { return null; }
}

/** Keep `read` as this board's read unless a full read is already kept. A
 *  draft is replaced only by a full read, and loses its prices with it. */
export async function keepBoardRead(fen: string, read: StockfishAnalysis): Promise<void> {
  if (!keepable(fen, read)) return;
  const key = positionOf(fen);
  try {
    await db.transaction('rw', db.boardReads, async () => {
      const prev = await db.boardReads.get(key);
      if (prev && !(isDraftRead(prev.read) && !isDraftRead(read))) return;
      await db.boardReads.put({ key, savedAt: Date.now(), read, prices: {} });
    });
    const extra = (await db.boardReads.count()) - BOARD_READS_KEEP;
    if (extra > 0) await db.boardReads.orderBy('savedAt').limit(extra).delete();
  } catch { /* fail-open: the board is simply read again next time */ }
}

/**
 * THE ONE READ OF A BOARD. The kept full read when there is one — no search.
 * Otherwise `fresh` runs, and its answer becomes the kept read when it can;
 * when the fresh read is no better than a kept draft, the draft is what this
 * board reads (so a second short read never changes a first one).
 */
export async function readBoardOnce(fen: string, fresh: () => Promise<StockfishAnalysis | null>): Promise<StockfishAnalysis | null> {
  const kept = await keptBoardRead(fen);
  if (kept && !isDraftRead(kept)) return kept;
  const read = await fresh();
  if (!read) return kept;
  if (kept && isDraftRead(read)) return kept;
  await keepBoardRead(fen, read);
  return keepable(fen, read) || !kept ? read : kept;
}

/** The kept price of `uci` from this board, or null. */
export async function keptMovePrice(fen: string, uci: string): Promise<MovePrice | null> {
  try { return (await db.boardReads.get(positionOf(fen)))?.prices[uci] ?? null; } catch { return null; }
}

/** Keep a SETTLED price of `uci` from this board, against its kept read.
 *  First price wins; a board with no kept read keeps no price (a price is
 *  only the same across games when the read it was measured against is). */
export async function keepMovePrice(fen: string, uci: string, price: MovePrice): Promise<void> {
  if (!price.settled) return;
  const key = positionOf(fen);
  try {
    await db.transaction('rw', db.boardReads, async () => {
      const row = await db.boardReads.get(key);
      if (!row || row.prices[uci]) return;
      await db.boardReads.put({ ...row, prices: { ...row.prices, [uci]: price } });
    });
  } catch { /* fail-open */ }
}
