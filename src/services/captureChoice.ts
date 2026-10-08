// THE OFF-BOOK METHOD — WHICH CAPTURE (batch 1, "opening and traps"): his
// "taking on d5 hands them d4 for a knight, so take on e5". Out of book, two
// captures are on offer and the way to choose is to play each one out — the
// capture, their natural recapture — and ask what square it hands them. A
// capture that takes away the last pawn that could ever challenge a square in
// front of their pieces gives their knight a permanent home there.
//
// Pure: chess.js + the one outpost definition (`isOutpost`) + the one knight
// distance (`knightReach`). The engine's best move is handed in, and the read
// only ever EXPLAINS the engine's choice between two captures — it never
// argues for a capture the engine does not play.
import { Chess, type Move, type Square } from 'chess.js';
import { isOutpost } from './outpost';
import { knightReach } from './moveInsight';
import { CAPTURE_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface CaptureChoice {
  text: string;
  /** The capture the engine prefers, SAN. */
  good: string;
  /** The capture that hands them a square, SAN, and their recapture. */
  bad: [string, string];
  /** The square it hands them. */
  square: string;
  /** Where their knight comes from to use it. */
  knightFrom: string;
  squares: string[];
  /** The student played the capture that hands it over. */
  playedBad: boolean;
}

/** Their natural recapture on the capture square: the cheapest piece that can
 *  take back legally. Null when nothing can. */
function recaptureOf(board: Chess, square: string): Move | null {
  const takers = board.moves({ verbose: true }).filter((m) => m.to === square && m.captured);
  takers.sort((a, b) => (CAPTURE_VALUE[a.piece] ?? 99) - (CAPTURE_VALUE[b.piece] ?? 99));
  return takers[0] ?? null;
}

/** Squares that become outposts for `side` after the exchange, which a knight
 *  of theirs reaches in two moves or fewer. */
function newOutposts(fenBefore: string, capture: string, side: 'w' | 'b'): { square: string; from: string; recapture: string } | null {
  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  try { after.move(capture); } catch { return null; }
  const r = recaptureOf(after, after.history({ verbose: true })[0].to);
  if (!r) return null;
  after.move(r.san);
  let best: { square: string; from: string; recapture: string; moves: number } | null = null;
  for (const f of 'abcdefgh') {
    for (let rk = 1; rk <= 8; rk += 1) {
      const sq = `${f}${rk}`;
      const piece = after.get(sq as Square);
      if (piece && piece.color === side) continue;
      if (!isOutpost(after, sq, side, true) || isOutpost(before, sq, side, true)) continue;
      // A centre-ish square only: files c–f.
      if (!'cdef'.includes(f)) continue;
      const reach = knightReach(after.fen(), sq, side);
      if (!reach || reach.moves > 2) continue;
      if (!best || reach.moves < best.moves) best = { square: sq, from: reach.from, recapture: r.san, moves: reach.moves };
    }
  }
  return best ? { square: best.square, from: best.from, recapture: best.recapture } : null;
}

/**
 * `fenBefore` = the board the student moved from; `san` their move; `bestSan`
 * the engine's; `cpLoss` the move's cost. Speaks when the student had (at
 * least) two captures, the engine's choice hands them no square, and the
 * other one hands their knight an outpost:
 *  • played the engine's capture (< 30cp) — "right capture: the other one
 *    hands them d4 for a knight";
 *  • played the other capture and it cost (≥ 50cp) — "that hands them d4 for a
 *    knight; take on e5 instead".
 */
export function captureChoice(fenBefore: string, san: string, bestSan: string | null, cpLoss: number): CaptureChoice | null {
  if (!bestSan) return null;
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return null; }
  const me = board.turn();
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const strip = (x: string): string => x.replace(/[+#]$/, '');
  // PAWN captures: the choice is about which pawn leaves its file — the
  // structure question. A piece capture is an exchange of material instead.
  const captures = board.moves({ verbose: true }).filter((m) => m.captured && !m.promotion && m.piece === 'p');
  const best = captures.find((m) => strip(m.san) === strip(bestSan));
  if (!best || captures.length < 2) return null;
  // The engine's capture must hand them nothing.
  if (newOutposts(fenBefore, best.san, them)) return null;
  const playedBest = strip(san) === strip(bestSan);
  if (playedBest && cpLoss >= 30) return null;
  const others = playedBest
    ? captures.filter((m) => m.san !== best.san && m.to !== best.to)
    : captures.filter((m) => strip(m.san) === strip(san));
  if (!playedBest && cpLoss < 50) return null;
  for (const o of others) {
    const h = newOutposts(fenBefore, o.san, them);
    if (!h) continue;
    const knight = 'knight';
    const dot = me === 'b' ? '…' : '';
    const text = playedBest
      ? rotateStem([
        `Right capture: taking on ${o.to} instead hands them ${h.square} for a ${knight} — after ${dot}${o.san} ${them === 'b' ? '…' : ''}${h.recapture}, no pawn of yours can ever chase a piece off ${h.square}.`,
        `The other capture, ${dot}${o.san}, would give their ${knight} ${h.square} for good — nothing of yours could ever kick it from there. Taking on ${best.to} keeps that square covered.`,
      ], stemKeyOf(fenBefore))
      : rotateStem([
        `Taking on ${o.to} hands them ${h.square} for a ${knight} — no pawn of yours can ever chase it off. ${dot}${best.san} was the capture.`,
        `${dot}${o.san} gives their ${knight} ${h.square} for good; taking on ${best.to} with ${dot}${best.san} keeps that square covered.`,
      ], stemKeyOf(fenBefore));
    return { text, good: best.san, bad: [o.san, h.recapture], square: h.square, knightFrom: h.from, squares: [o.from, o.to, h.square, h.from], playedBad: !playedBest };
  }
  return null;
}

/** THE PROSPECTIVE READ (the student to move; names the move — where it may
 *  be named): the engine's capture and why the other hands them a square. */
export function captureChoiceIdea(fen: string, bestSan: string | null): CaptureChoice | null {
  const c = captureChoice(fen, bestSan ?? '', bestSan, 0);
  if (!c) return null;
  const dot = new Chess(fen).turn() === 'b' ? '…' : '';
  return { ...c, text: `Two captures here. ${dot}${c.bad[0]} hands their knight ${c.square} for good — no pawn of yours could ever chase it — so take on ${new Chess(fen).move(c.good).to} with ${dot}${c.good}.` };
}
