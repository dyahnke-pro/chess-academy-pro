// practicalChance — WORSE, SO MAKE THEM FIND IT (Danya, "Plus-Equals Mode":
// "ask your opponent some questions; give him an opportunity to falter";
// "How to Survive a Chess Disaster": "Grischuk had one last trick up his
// sleeve … the complications are not all that easy to calculate";
// "Never Resign Prematurely": "even if your opponent appears to be winning by
// force, play out the sequence … maybe you will find an extraordinary
// defensive resource").
//
// THE MOVE, either seat: the mover stands worse before it by the engine
// (`WORSE_CP` or more against them, no forced mate), and the move is sound —
// it cost its mover less than `SOUND_CP` against the engine's best. With the engine's
// replies to it (three or more lines, best first) it poses a problem when one
// of these is true:
//  · ONLY MOVE — the best reply keeps their edge, and the next best already
//    gives it back (they keep `LEVEL_CP` or less, `GAP_CP` or more worse than
//    the best reply), and that reply is no retake on the move's square.
//    The engine's lines are ranked, so every reply it does not
//    list is worse still: one reply, and only one, keeps the edge.
//  · TRAP — a natural reply, a capture that wins material by the legal
//    exchange (the grab), gives the edge back by the same bar. A reply the
//    engine does not list scores no better than its last listed line, so a
//    natural reply missing from the lines is held to that line's score.
//  · DEEP — even the best reply's own line takes `DEEP_MOVES` of their moves
//    before it wins material (the raw count after each answer, a pawn or a mate): the way
//    through is long to calculate. Read on the line itself, move by move with
//    chess.js — no line that shows the win, no claim that it is deep — and
//    only while the material is level (or the mover's): an edge already on
//    the board is no long calculation.
// Nothing true, nothing said: a worse side's move that sets no problem is not
// praised for trying.
//
// PURE: chess.js, the legal exchange and the engine lines the surface hands in.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { materialBalance } from './pieceValues';
import { seatCp } from './winChance';
import type { AnalysisLine } from '../types';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { other } from './tradeWords';

/** The mover is at least this far down before the move: worse. */
export const WORSE_CP = 100;
/** The move is within this of the engine's best: sound. */
const SOUND_CP = 50;
/** Their best reply keeps at least this: the edge is still theirs. */
const EDGE_CP = 100;
/** A reply that leaves them this or less has given it back: about level. */
const LEVEL_CP = 30;
/** … and it is at least this much worse for them than the best reply. */
const GAP_CP = 100;
/** Their own moves their best line needs before it wins material, for "deep". */
export const DEEP_MOVES = 4;
/** …read no further down the line than this many of their moves: past it an
 *  engine line is a guess, and a win it shows there proves nothing. */
const TRUSTED_MOVES = 6;
/** What "wins material" means on the line: a pawn or more, the quiet count. */
const WIN_PAWNS = 1;
/** Lines of replies the claim of a single good reply needs. */
const MIN_REPLIES = 3;

export interface PracticalChance {
  /** The worse side, the mover. */
  side: Color;
  san: string;
  from: Square;
  to: Square;
  /** The one reply that keeps their edge, or null. */
  only: { san: string; uci: string } | null;
  /** A natural reply that gives the edge back, or null. */
  trap: { san: string; uci: string } | null;
  /** Their own moves their best line needs to win material, when deep. */
  deep: number | null;
  /** The best reply's line (SAN, from the board after the move). */
  bestLine: string[];
  key: string;
}

const boardOf = (fen: string): Chess | null => { try { return new Chess(fen); } catch { return null; } };
const uciOf = (m: Pick<Move, 'from' | 'to' | 'promotion'>): string => `${m.from}${m.to}${m.promotion ?? ''}`;

/** The SANs of a UCI line from `fen`, stopping at the first illegal move. */
function sansOf(fen: string, moves: readonly string[]): string[] {
  const c = boardOf(fen);
  const out: string[] = [];
  if (!c) return out;
  for (const u of moves) {
    try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; }
  }
  return out;
}

/** How many of its own moves the side to move on `fen` needs, along
 *  `moves`, before it wins material for good: the raw count, read after each
 *  answer of the other side (so a capture taken straight back is no win),
 *  `WIN_PAWNS` up on the start and never below it for the rest of the line —
 *  or a mate. Null when the line never shows one. */
export function movesToWin(fen: string, moves: readonly string[]): number | null {
  const c = boardOf(fen);
  if (!c) return null;
  const side = c.turn();
  const sign = side === 'w' ? 1 : -1;
  const start = materialBalance(fen) * sign;
  const gains: Array<{ mine: number; gain: number }> = [];
  const played: Move[] = [];
  let mine = 0;
  for (const u of moves) {
    let m: Move;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    played.push(m);
    if (m.color === side) mine += 1;
    if (c.isCheckmate()) return m.color === side ? mine : null;
    if (m.color !== side) gains.push({ mine, gain: materialBalance(c.fen()) * sign - start });
  }
  // A count taken in the middle of an exchange is no count: the other side's
  // capture that the line answers with a capture on the same square, or that
  // ends the line, leaves the trade still going.
  for (let k = played.length - 1, g = gains.length - 1; k >= 0 && g >= 0; k -= 1) {
    const m = played[k];
    if (m.color === side) continue;
    const last = k + 1 >= played.length;
    if (m.captured && (last || (played[k + 1].captured && played[k + 1].to === m.to))) gains.splice(g, 1);
    g -= 1;
  }
  for (let i = 0; i < gains.length; i += 1) {
    if (gains.slice(i).every((g) => g.gain >= WIN_PAWNS)) return gains[i].mine;
  }
  return null;
}

/** The natural replies on `fenAfter` (the other side to move): the captures
 *  that win material by the legal exchange, the biggest grab first. */
function naturalReplies(fenAfter: string): Move[] {
  const c = boardOf(fenAfter);
  if (!c) return [];
  const me = c.turn();
  const out: Array<{ move: Move; gain: number }> = [];
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured) continue;
    const gain = legalSeeGainFor(fenAfter, m.to, me);
    if (gain > 0) out.push({ move: m, gain });
  }
  return out.sort((a, b) => b.gain - a.gain).map((x) => x.move);
}

/** THE ENGINE'S READ AROUND THE MOVE: the mover's score before it at best
 *  play (cp, the mover's seat; null: no read, or a forced mate), what the
 *  move cost its mover against the best (cp; null: unknown), and the
 *  engine's lines on the board after the move — their replies, best first,
 *  White-POV scores. One line is enough for "deep"; the single good reply
 *  and the trap need `MIN_REPLIES` ranked lines. */
export interface PracticalReads {
  moverCp: number | null;
  costCp: number | null;
  after: readonly AnalysisLine[];
}

/** THE PROBLEM the move `san` on `fenBefore` sets, from the worse side. Null
 *  unless the mover is worse, the move is sound, and it poses a problem the
 *  lines prove. */
export function practicalChance(fenBefore: string, san: string, reads: PracticalReads): PracticalChance | null {
  const { moverCp, costCp, after } = reads;
  if (moverCp === null || costCp === null || after.length === 0) return null;
  if (moverCp > -WORSE_CP || costCp >= SOUND_CP) return null;
  const c = boardOf(fenBefore);
  if (!c) return null;
  const me = c.turn();
  const them = other(me);
  let mv: Move;
  try { mv = c.move(san); } catch { return null; }
  if (c.isGameOver()) return null;
  const fenAfter = c.fen();
  // Their best reply keeps their edge (the move does not simply equalise).
  if (after[0].mate != null && after[0].mate < 0) return null;
  const top = seatCp(after[0], them);
  if (top < EDGE_CP) return null;
  const gives = (cp: number): boolean => cp <= LEVEL_CP && cp <= top - GAP_CP;
  let only: PracticalChance['only'] = null;
  let trap: PracticalChance['trap'] = null;
  if (after.length >= MIN_REPLIES) {
    const second = seatCp(after[1], them);
    const bestReply = sansOf(fenAfter, after[0].moves.slice(0, 1))[0];
    // Taking back on the square the move landed on is no problem to solve:
    // every player sees a retake (article boards 2026-11-18: "only Rxa7
    // keeps their edge" after …Rxa7 took a rook).
    const retake = after[0].moves[0].slice(2, 4) === mv.to;
    if (gives(second) && bestReply && !retake) only = { san: bestReply, uci: after[0].moves[0] };
    const floor = seatCp(after[after.length - 1], them);
    for (const r of naturalReplies(fenAfter)) {
      const ru = uciOf(r);
      // A retake of the moved piece is not a free grab.
      if (ru === after[0].moves[0] || r.to === mv.to) continue;
      const listed = after.find((l) => l.moves[0] === ru);
      const cp = listed ? seatCp(listed, them) : floor;
      if (gives(cp)) { trap = { san: r.san, uci: ru }; break; }
    }
  }
  // A long way through only where the board does not already show their
  // edge: with them up material now, "their line needs N moves to win
  // material" says nothing about how hard the position is.
  const even = materialBalance(fenAfter) * (me === 'w' ? 1 : -1) >= 0;
  const win = even ? movesToWin(fenAfter, after[0].moves) : null;
  const deep = win !== null && win >= DEEP_MOVES && win <= TRUSTED_MOVES ? win : null;
  if (!only && !trap && deep === null) return null;
  return {
    side: me, san: mv.san, from: mv.from, to: mv.to, only, trap, deep,
    bestLine: sansOf(fenAfter, after[0].moves),
    key: `practical:${mv.from}${mv.to}`,
  };
}

/** The squares a read shows: the move's, and the trap's landing. */
export function practicalChanceSquares(p: PracticalChance): Square[] {
  const out = new Set<Square>([p.from, p.to]);
  if (p.trap) out.add(p.trap.uci.slice(2, 4) as Square);
  return [...out];
}

const MOVES = (n: number): string => (n === 1 ? 'a move' : `${['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? n} moves`);

/** Said from the student's seat (`moverIsStudent`): the worse side is the
 *  student or the opponent. Never names the mover's own move; on the
 *  opponent's seat it names no reply of the student's either — that reply is
 *  the student's to find (`heldForm` carries the same words). */
export function practicalChanceLine(p: PracticalChance, moverIsStudent: boolean, fen: string): string {
  const key = stemKeyOf(`${fen}|${p.key}`);
  const parts: string[] = [];
  if (moverIsStudent) {
    parts.push(rotateStem([
      'You\'re worse here, so make them find something.',
      'When you\'re worse, set them problems.',
      'Behind like this, the job is to make it hard for them.',
    ], key));
    if (p.only) parts.push(`Only ${p.only.san} keeps their edge, and anything else lets you back in.`);
    if (p.trap) parts.push(`${p.trap.san} looks free, but taking gives the edge back.`);
    if (p.deep !== null) parts.push(`Even their best line needs ${MOVES(p.deep)} before it wins material that stays won.`);
    return parts.join(' ');
  }
  parts.push(rotateStem([
    'They\'re worse, so they\'re setting you a problem.',
    'Behind, they\'re trying to make it hard for you.',
  ], key));
  if (p.only) parts.push('Only one reply keeps your edge.');
  if (p.trap) parts.push('The capture that looks free gives the edge back.');
  if (p.deep !== null) parts.push(`Your way through is long: your best line needs ${MOVES(p.deep)} before it wins material that stays won.`);
  parts.push(p.only || p.trap ? 'Look at every forcing reply before you pick one.' : 'Slow down and calculate.');
  return parts.join(' ');
}
