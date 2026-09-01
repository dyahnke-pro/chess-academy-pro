/**
 * endgameTablebaseService — the TRUTH engine for interactive endgame training
 * (Batch B / P-V.2, David 2026-09-01: "not just walks out but allows the user to
 * play and explains the why behind any mistakes and allows for the user to
 * correct").
 *
 * The Syzygy tablebase (≤7 pieces) is PERFECT play — it knows win/draw/loss and
 * the optimal move for every position. This service reads the per-move results
 * the proxy already forwards (`/api/lichess-tablebase` returns `moves[]`), so:
 *   - `tablebaseMoves(fen)` — every legal move ranked best-first with its WDL/DTZ
 *   - `bestEndgameMove(fen)` — the optimal move (Watch walk + opponent replies)
 *   - `gradeEndgameMove(fen, uci)` — was the student's move optimal, or did it
 *     throw the win / throw the draw? + the best move + a GROUNDED why
 *
 * G0/G3: the tablebase decides win/draw/loss and best move; chess.js validates
 * legality; the WHY is computed from the WDL delta + board geometry. The LLM only
 * phrases the computed facts downstream (voiceFacts). Nothing here is invented.
 */
import { Chess } from 'chess.js';
import type { TablebaseCategory } from './lichessTablebaseService';

const TABLEBASE_PROXY_PATH = '/api/lichess-tablebase';
const FETCH_TIMEOUT_MS = 8_000;

/** One legal move's tablebase verdict. `category` is from the perspective of the
 *  side to move AFTER the move (i.e. the opponent) — Lichess's convention. */
export interface TablebaseMove {
  uci: string;
  san: string;
  /** Opponent-to-move category after this move (their perspective). */
  category: TablebaseCategory;
  dtz: number | null;
  dtm: number | null;
  checkmate: boolean;
  stalemate: boolean;
}

export interface TablebaseMovesResult {
  /** Side-to-move category for the CURRENT position. */
  category: TablebaseCategory;
  /** Moves sorted best-first for the side to move (Lichess order). */
  moves: TablebaseMove[];
}

function countPieces(fen: string): number {
  return fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
}

/** WDL from the MOVER's perspective, coarse (win/draw/loss), as a number for
 *  comparison: +1 win, 0 draw, -1 loss. A move's `category` is the opponent's
 *  result after it, so the mover's result is the INVERSE. cursed-win / blessed-
 *  loss (50-move-rule shifted) collapse to win / loss for WDL purposes here. */
function categoryToWdl(cat: TablebaseCategory): number | null {
  switch (cat) {
    case 'win': case 'cursed-win': case 'maybe-win': return 1;
    case 'loss': case 'blessed-loss': case 'maybe-loss': return -1;
    case 'draw': return 0;
    default: return null;
  }
}

/** The mover's WDL after playing a move whose (opponent-perspective) category is
 *  `cat` — the inverse of the opponent's result. */
function moverWdlAfter(cat: TablebaseCategory): number | null {
  const opp = categoryToWdl(cat);
  return opp === null ? null : -opp;
}

/** Fetch every legal move's tablebase verdict for a ≤7-piece position, ranked
 *  best-first. Returns null out of range / on network failure (caller degrades). */
export async function tablebaseMoves(fen: string): Promise<TablebaseMovesResult | null> {
  if (countPieces(fen) > 7) return null;
  let origin = '';
  try { origin = window.location.origin; } catch { origin = ''; }
  const url = new URL(TABLEBASE_PROXY_PATH, origin || 'https://chess-academy-pro.vercel.app');
  url.searchParams.set('fen', fen);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      category?: TablebaseCategory;
      moves?: Array<{ uci?: string; san?: string; category?: TablebaseCategory; dtz?: number | null; dtm?: number | null; checkmate?: boolean; stalemate?: boolean }>;
    };
    if (!json.category || !Array.isArray(json.moves)) return null;
    const moves: TablebaseMove[] = json.moves
      .filter((m): m is Required<Pick<typeof m, 'uci' | 'category'>> & typeof m => !!m.uci && !!m.category)
      .map((m) => ({
        uci: m.uci as string,
        san: m.san ?? m.uci as string,
        category: m.category as TablebaseCategory,
        dtz: m.dtz ?? null,
        dtm: m.dtm ?? null,
        checkmate: !!m.checkmate,
        stalemate: !!m.stalemate,
      }));
    return { category: json.category, moves };
  } catch {
    return null;
  }
}

/** The optimal move for the side to move (best-first order from the tablebase),
 *  or null out of range / on failure. */
export async function bestEndgameMove(fen: string): Promise<TablebaseMove | null> {
  const tb = await tablebaseMoves(fen);
  return tb?.moves[0] ?? null;
}

export type EndgameMoveVerdict = 'optimal' | 'slower' | 'threw-win' | 'threw-draw' | 'still-lost' | 'unknown';

export interface EndgameMoveGrade {
  verdict: EndgameMoveVerdict;
  /** True when the WDL got worse — a real mistake worth correcting. */
  isMistake: boolean;
  playedSan: string;
  bestUci: string;
  bestSan: string;
  /** Mover's WDL before the move and after (best play) and after (played). */
  wdlBefore: number | null;
  wdlBest: number | null;
  wdlPlayed: number | null;
  /** A grounded, one-line why — the WDL delta + the best move's point. */
  why: string;
}

/** DTZ magnitude for "still winning but slower" comparison. */
function absDtz(m: TablebaseMove): number | null {
  return typeof m.dtz === 'number' ? Math.abs(m.dtz) : null;
}

/**
 * gradeEndgameMove — was the student's move optimal? Compares the played move's
 * tablebase result to the best move's. Returns the verdict + a grounded WHY. The
 * WDL verdicts (threw-win / threw-draw) are TABLEBASE-CERTAIN; "slower" preserves
 * the result but takes longer (still fine — a soft note, not a mistake).
 *
 * G0: every field computed from the tablebase + chess.js. `why` states what was
 * thrown (certain) and names the best move + its board point.
 */
export async function gradeEndgameMove(fen: string, playedUci: string): Promise<EndgameMoveGrade | null> {
  const tb = await tablebaseMoves(fen);
  if (!tb || tb.moves.length === 0) return null;
  const best = tb.moves[0];
  const played = tb.moves.find((m) => m.uci === playedUci);
  if (!played) return null; // not a legal tablebase move (shouldn't happen post-validation)

  const wdlBefore = moverWdlAfter(best.category); // best play preserves the current best result
  const wdlBest = moverWdlAfter(best.category);
  const wdlPlayed = moverWdlAfter(played.category);

  let verdict: EndgameMoveVerdict = 'unknown';
  let isMistake = false;
  if (wdlPlayed !== null && wdlBest !== null) {
    if (wdlPlayed === wdlBest) {
      // Same result. Slower only if DTZ got materially worse and we're winning.
      const pB = absDtz(best); const pP = absDtz(played);
      verdict = (wdlBest > 0 && pB !== null && pP !== null && pP > pB) ? 'slower' : 'optimal';
    } else if (wdlBest > 0 && wdlPlayed === 0) { verdict = 'threw-win'; isMistake = true; }
    else if (wdlBest > 0 && wdlPlayed < 0) { verdict = 'threw-win'; isMistake = true; }
    else if (wdlBest === 0 && wdlPlayed < 0) { verdict = 'threw-draw'; isMistake = true; }
    else if (wdlBest < 0) { verdict = 'still-lost'; } // already lost; not the student's fault
    else verdict = 'optimal';
  }

  const why = buildEndgameWhy(fen, best, verdict);
  return {
    verdict, isMistake,
    playedSan: played.san, bestUci: best.uci, bestSan: best.san,
    wdlBefore, wdlBest, wdlPlayed, why,
  };
}

/** A grounded one-line WHY for the grade — the certain WDL consequence + the
 *  best move's concrete board point (capture / check / the square it takes).
 *  Pure chess.js geometry; never invented. */
function buildEndgameWhy(fen: string, best: TablebaseMove, verdict: EndgameMoveVerdict): string {
  const point = bestMovePoint(fen, best);
  const bestClause = point ? `${best.san} ${point}` : best.san;
  switch (verdict) {
    case 'threw-win':
      return `That lets it slip — the win is gone. ${bestClause} kept it winning.`;
    case 'threw-draw':
      return `That loses the hold — this is lost now. ${bestClause} kept the draw.`;
    case 'slower':
      return `Still winning, but slower than it needs to be. ${bestClause} is the quickest.`;
    case 'still-lost':
      return `The position was already lost with best play; that doesn't change it.`;
    case 'optimal':
      return `Optimal — that's the tablebase move.`;
    default:
      return bestClause;
  }
}

/** The best move's concrete board point from chess.js geometry — a capture, a
 *  check, a promotion, else the square it takes. Honest and terse. */
function bestMovePoint(fen: string, best: TablebaseMove): string | null {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), promotion: best.uci.length > 4 ? best.uci[4] : undefined });
    if (!mv) return null;
    if (mv.san.includes('#')) return 'is checkmate';
    if (mv.flags.includes('p')) return 'queens the pawn';
    if (mv.captured) return `takes on ${mv.to}`;
    if (mv.san.includes('+')) return 'checks the king';
    if (mv.piece === 'k') return `walks the king to ${mv.to}`;
    if (mv.piece === 'p') return `pushes to ${mv.to}`;
    return `goes to ${mv.to}`;
  } catch {
    return null;
  }
}

/** One ply of a tablebase-perfect walk, with the mover + a grounded note. */
export interface EndgameWalkStep {
  fenBefore: string;
  uci: string;
  san: string;
  fenAfter: string;
  mover: 'white' | 'black';
  /** Grounded note for the Watch narration — the move's board point. */
  note: string;
}

/**
 * buildTablebaseWalk — play the ending out with BOTH sides at tablebase-perfect
 * play from `fen`, up to `maxPlies`, so the coach can WATCH the technique unfold.
 * Each step carries a grounded note (the move's board point). Stops at
 * mate/stalemate, when the tablebase can't answer, or at the ply cap.
 *
 * G3: every move is the tablebase's optimal move (real, legal); chess.js computes
 * the FENs. The narration downstream phrases the notes.
 */
export async function buildTablebaseWalk(fen: string, maxPlies = 24): Promise<EndgameWalkStep[]> {
  const steps: EndgameWalkStep[] = [];
  let cur = fen;
  for (let i = 0; i < maxPlies; i++) {
    if (countPieces(cur) > 7) break;
    const best = await bestEndgameMove(cur);
    if (!best) break;
    let board: Chess;
    let mv;
    try {
      board = new Chess(cur);
      mv = board.move({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), promotion: best.uci.length > 4 ? best.uci[4] : undefined });
    } catch { break; }
    if (!mv) break;
    const mover: 'white' | 'black' = mv.color === 'w' ? 'white' : 'black';
    steps.push({
      fenBefore: cur,
      uci: best.uci,
      san: mv.san,
      fenAfter: board.fen(),
      mover,
      note: bestMovePoint(cur, best) ?? mv.san,
    });
    if (board.isGameOver()) break;
    cur = board.fen();
  }
  return steps;
}

export const _endgameTbInternals = { categoryToWdl, moverWdlAfter, buildEndgameWhy, bestMovePoint };
