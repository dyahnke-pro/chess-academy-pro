// thinkingKeyCheck — THE ENGINE CHECKS A LESSON'S ANSWER KEY BEFORE IT IS ASKED
// (Learn how to think, David 2026-10-23: "Engine-check every board").
//
// WHY. The material steps key their answers by STATIC counting (`findHangingBySee`:
// attackers vs defenders, cheapest first). Counting cannot see a capture that
// walks into mate, an in-between move, or a bigger shot elsewhere on the board.
// Measured 2026-10-23 on 400 Lichess puzzles rated 800–1600, Stockfish depth 12:
//   · "their targets": of 36 attacked target pieces, taking 18 was at least 1.5
//     pawns worse than the best move — the lesson praised the smaller find on a
//     board with a mate on it; on 11 of 83 boards the best move took a piece the
//     key left out, so tapping it was graded wrong;
//   · "am I safe?": of 105 flagged pieces, 20 would cost THEM 1.5 pawns to take.
// So a board whose key claims material can be won (or lost) is asked only when
// the engine agrees. A board it does not agree with is DROPPED — never asked
// with a wrong key, never "corrected" by hand.
//
// WHAT IS CHECKED, AND WHAT IS NOT. Only keys that claim MATERIAL: what you can
// win now, what they can win now, where a piece is safe, a fork, a pile-on. A
// key that is a fact of geometry needs no engine — a piece nobody guards, a
// square that gives check, what their move newly attacks, whose king is more
// exposed — and the steps keyed by the engine already (candidates) or by a
// real solution line (calculate) are checked at their source.
//
// THE RULE, ONE NUMBER: a keyed move must be within `MARGIN_CP` of the best move
// on the board, and the best move must not take a piece the key leaves out.
// The same margin the probe measured with — never a second threshold.
//
// PURE over an injected scorer (`KeyScorer`), so it is tested without an
// engine and the step kits that import it stay chess.js-only; the app's scorer
// (the one Stockfish singleton) is `thinkingKeyScorer.ENGINE_KEY_SCORER`.
import { Chess, type Move, type Square } from 'chess.js';

/** A keyed move may be this far below the best move (centipawns). Beyond it,
 *  the move is a mistake, or the board's real point is something bigger. */
export const MARGIN_CP = 150;

/** Scores, side-to-move point of view (a mate is a large number). */
export interface KeyScorer {
  /** The best move on the board and its score; null when the engine cannot read it. */
  best(fen: string): Promise<{ cp: number; uci: string } | null>;
  /** The best score among these moves only; null when the engine cannot read it. */
  bestOf(fen: string, ucis: readonly string[]): Promise<number | null>;
}

/** A step's check of its key on one board: true only when the engine agrees. */
export type KeyCheck = (fen: string, key: readonly Square[], scorer: KeyScorer) => Promise<boolean>;

const uci = (m: Pick<Move, 'from' | 'to' | 'promotion'>): string => `${m.from}${m.to}${m.promotion ?? ''}`;

function movesOf(fen: string): Move[] {
  try { return new Chess(fen).moves({ verbose: true }); } catch { return []; }
}

/** The board with the other side to move (a "null move"), or null when that
 *  is not a legal board (a king left in check). */
export function otherSideToMove(fen: string): string | null {
  const f = fen.trim().split(/\s+/);
  if (f.length < 4) return null;
  f[1] = f[1] === 'w' ? 'b' : 'w';
  f[3] = '-';
  const flipped = f.join(' ');
  try {
    const c = new Chess(fen);
    if (c.inCheck()) return null;          // the side to move must answer the check first
    const d = new Chess(flipped);
    return d.inCheck() ? null : flipped;   // never a board where the mover could take a king
  } catch {
    return null;
  }
}

/** Does the best move take a non-pawn piece on a square the key leaves out? */
function bestTakesOutsideKey(fen: string, bestUci: string, key: readonly Square[]): boolean {
  const m = movesOf(fen).find((x) => uci(x) === bestUci);
  return !!m && !!m.captured && m.captured !== 'p' && !key.includes(m.to);
}

/**
 * Every key square is a capture the side to move can make NOW, each within the
 * margin of the best move, and the best move takes nothing the key leaves out.
 * ("Their targets — what you can win now", "my forcing moves — captures that win".)
 */
export async function capturesCheck(fen: string, key: readonly Square[], scorer: KeyScorer): Promise<boolean> {
  const moves = movesOf(fen);
  const best = await scorer.best(fen);
  if (!best) return false;
  // An EMPTY key ("nothing here") holds only when the best move takes no piece.
  if (bestTakesOutsideKey(fen, best.uci, key)) return false;
  for (const sq of key) {
    const caps = moves.filter((m) => m.to === sq && m.captured);
    if (caps.length === 0) return false;
    const s = await scorer.bestOf(fen, caps.map(uci));
    if (s === null || best.cp - s > MARGIN_CP) return false;
  }
  return true;
}

/**
 * The same check from THEIR side: if they were to move now, taking each key
 * piece is within the margin of their best move, and their best takes nothing
 * the key leaves out. ("Am I safe?", "Is my move safe?" — the danger is real.)
 */
export async function dangerCheck(fen: string, key: readonly Square[], scorer: KeyScorer): Promise<boolean> {
  const theirs = otherSideToMove(fen);
  if (!theirs) return false;
  return capturesCheck(theirs, key, scorer);
}

/**
 * Each keyed move (any move of the side to move landing on a key square,
 * restricted by `which`) is within the margin of the best move. For forks and
 * pile-ons: the move the key names really works on this board.
 */
export function landingCheck(which: (m: Move) => boolean): KeyCheck {
  return async (fen, key, scorer) => {
    if (key.length === 0) return true;
    const moves = movesOf(fen).filter(which);
    const best = await scorer.best(fen);
    if (!best) return false;
    for (const sq of key) {
      const to = moves.filter((m) => m.to === sq);
      if (to.length === 0) return false;
      const s = await scorer.bestOf(fen, to.map(uci));
      if (s === null || best.cp - s > MARGIN_CP) return false;
    }
    return true;
  };
}

/**
 * "Answer the danger" (move the piece in danger to a safe square): the danger
 * is real, every keyed square is a good answer, and every square the key
 * leaves out is clearly worse (so a tap there is fairly wrong).
 */
export function answerDangerCheck(pieceInDanger: (fen: string) => Square | null): KeyCheck {
  return async (fen, key, scorer) => {
    const from = pieceInDanger(fen);
    if (!from) return false;
    if (!(await dangerCheck(fen, [from], scorer))) return false;
    const best = await scorer.best(fen);
    if (!best) return false;
    for (const m of movesOf(fen).filter((x) => x.from === from)) {
      const s = await scorer.bestOf(fen, [uci(m)]);
      if (s === null) return false;
      const loss = best.cp - s;
      if (key.includes(m.to) ? loss > MARGIN_CP : loss <= MARGIN_CP) return false;
    }
    return true;
  };
}
