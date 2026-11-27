// THE DISCOVERED ATTACK, PROVEN (Coach Build Board, "computers just built",
// rebuilt 2026-11-27): a move that steps a piece off the line between one of
// the mover's line pieces (bishop, rook, queen) and an enemy target, so the
// line piece now hits it while the moved piece does its own work. Said ONLY
// when EVERY reply still loses material — more than was already there to take
// before the move — with the line as proof: the move, their best defence, the
// capture that wins.
//
// Both seats: read for the side to move on `fen` (the student's chance), or on
// the board handed to the other side (`threatOut.flipSideToMove`) for theirs.
// DUAL-USE: the same read teaches the discovery and files the miss
// (`missed-your-discovery` / `missed-their-discovery`, `moveInsight`).
//
// PURE: chess.js, the legal exchange count and the one immediate-win read.
import { Chess, type Color, type Square } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { legalSeeGain } from './positionReadingService';
import { immediateWin, MATE_GAIN } from './immediateWin';
import { flipSideToMove } from './threatOut';

export interface DiscoveredAttack {
  /** The discovering move, SAN. */
  san: string;
  from: string;
  to: string;
  /** The side that plays it. */
  side: Color;
  /** The line piece uncovered, and what it now hits. */
  uncovered: { square: string; piece: string };
  target: { square: string; piece: string };
  /** The proof: the move, their best defence, the capture that wins. */
  line: string[];
  /** What it wins against their best defence, pawns (MATE_GAIN for mate). */
  gain: number;
  mate: boolean;
}

/** A discovery must win at least this much against every reply (pawns): a
 *  minor piece's worth less a pawn — an exchange or more. */
export const DISCOVERY_MIN_GAIN = 2;

const SLIDES: Record<string, ReadonlyArray<readonly [number, number]>> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
};
const sqOf = (f: number, r: number): Square | null => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? (`${String.fromCharCode(97 + f)}${r}` as Square) : null);

/** The first piece along a ray from `from` (not counting `from`). */
function firstOnRay(c: Chess, from: string, df: number, dr: number): { square: Square; type: string; color: Color } | null {
  let f = from.charCodeAt(0) - 97 + df;
  let r = Number(from[1]) + dr;
  for (let s = sqOf(f, r); s; s = sqOf(f += df, r += dr)) {
    const p = c.get(s);
    if (p) return { square: s, type: p.type, color: p.color };
  }
  return null;
}

/** The line a move uncovers onto an enemy king or piece of a minor's worth or
 *  more: a line piece of the mover's behind `from`, the target in front once
 *  the piece has gone (never the moved piece's own landing). */
function uncoveredLine(before: Chess, from: string, to: string, me: Color): { uncovered: { square: string; piece: string }; target: { square: string; piece: string } } | null {
  for (const [df, dr] of SLIDES.q) {
    const back = firstOnRay(before, from, -df, -dr);
    if (!back || back.color !== me) continue;
    if (!SLIDES[back.type]?.some(([a, b]) => a === df && b === dr)) continue;
    const front = firstOnRay(before, from, df, dr);
    if (!front || front.color === me) continue;
    // The piece moving along the line still blocks it (or takes the target).
    if (onSegment(from, front.square, to, df, dr)) continue;
    if (front.type !== 'k' && (MATERIAL_VALUE[front.type] ?? 0) < 3) continue;
    return { uncovered: { square: back.square, piece: back.type }, target: { square: front.square, piece: front.type } };
  }
  return null;
}

/** Captures and checks first. */
const forcing = (m: { san: string; captured?: string }): number => (m.captured ? 2 : 0) + (/[+#]/.test(m.san) ? 1 : 0);

/** Is `to` on the ray from `from` (exclusive) up to `end` (inclusive)? */
function onSegment(from: string, end: string, to: string, df: number, dr: number): boolean {
  let f = from.charCodeAt(0) - 97 + df;
  let r = Number(from[1]) + dr;
  for (let s = sqOf(f, r); s; s = sqOf(f += df, r += dr)) {
    if (s === to) return true;
    if (s === end) return false;
  }
  return false;
}

/** What the discovering side has won once the reply `b` is on the board: what
 *  its move took, plus its best capture now (counted to the end of the trades
 *  on that square), less what the reply took and less what the other side
 *  then wins elsewhere — so a piece left hanging by the win, or a check that
 *  leaves nothing to take, is no win. */
function netAfterReply(b: Chess, took: number, back: number): { gain: number; win: string | null; mate: boolean } {
  if (b.isCheckmate()) return { gain: -MATE_GAIN, win: null, mate: false };
  const fen = b.fen();
  let best: { gain: number; win: string | null; mate: boolean } = { gain: -MATE_GAIN, win: null, mate: false };
  // Every winning capture, each net of what the other side then wins
  // elsewhere: the capture that leaves nothing hanging is the proof.
  for (const m of b.moves({ verbose: true })) {
    if (m.san.endsWith('#')) return { gain: MATE_GAIN, win: m.san, mate: true };
    if (!m.captured) continue;
    const g = legalSeeGain(fen, m.to as Square);
    if (g <= 0) continue;
    const c2 = new Chess(fen);
    c2.move(m.san);
    const counter = immediateWin(c2.fen(), m.to);
    const net = took + g - back - (counter.mate ? MATE_GAIN : counter.gain);
    if (net > best.gain) best = { gain: net, win: m.san, mate: false };
  }
  return best;
}

/** THE DISCOVERED ATTACKS of the side to move on `fen` that win by force,
 *  most won first. */
export function discoveredAttacks(fen: string): DiscoveredAttack[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  if (c.inCheck() || c.isGameOver()) return [];
  const me = c.turn();
  // What is already there to take: the discovery must win more than that
  // (read once, only when a line is uncovered).
  let already: ReturnType<typeof immediateWin> | null = null;
  const out: DiscoveredAttack[] = [];
  for (const m of c.moves({ verbose: true })) {
    const found = uncoveredLine(c, m.from, m.to, me);
    if (!found) continue;
    already ??= immediateWin(fen);
    const after = new Chess(fen);
    after.move(m.san);
    // The quick bar first: given another move at once, would the mover win
    // more than was already there? If not, no reply needs reading.
    if (!after.inCheck()) {
      const again = flipSideToMove(after.fen());
      const threat = again ? immediateWin(again) : null;
      if (threat && !threat.mate && (threat.gain + (m.captured ? MATERIAL_VALUE[m.captured] ?? 0 : 0) < DISCOVERY_MIN_GAIN || threat.gain <= already.gain)) continue;
    }
    // Captures and checks first: the reply that refutes is usually one, and the
    // read stops at the first reply that holds.
    const replies = after.moves({ verbose: true }).sort((a, b) => forcing(b) - forcing(a));
    if (replies.length === 0) continue; // a mate or a stalemate is not this read
    const took = m.captured ? MATERIAL_VALUE[m.captured] ?? 0 : 0;
    // EVERY REPLY STILL LOSES MATERIAL: their best defence is the reply after
    // which the mover's win is smallest; it must still clear the bar.
    let worst: { gain: number; reply: string; win: string | null; mate: boolean } | null = null;
    for (const r of replies) {
      const b = new Chess(after.fen());
      b.move(r.san);
      const back = r.captured ? MATERIAL_VALUE[r.captured] ?? 0 : 0;
      const net = netAfterReply(b, took, back);
      if (!worst || net.gain < worst.gain) worst = { gain: net.gain, reply: r.san, win: net.win, mate: net.mate };
      if (worst.gain < DISCOVERY_MIN_GAIN) break;
    }
    if (!worst || worst.gain < DISCOVERY_MIN_GAIN) continue;
    if (!worst.win) continue; // the proof is the capture that wins
    // A piece that simply hung already is no discovery.
    if (!worst.mate && worst.gain <= already.gain) continue;
    out.push({
      san: m.san, from: m.from, to: m.to, side: me, uncovered: found.uncovered, target: found.target,
      line: [m.san, worst.reply, ...(worst.win ? [worst.win] : [])], gain: worst.mate ? MATE_GAIN : worst.gain, mate: worst.mate,
    });
  }
  return out.sort((a, b) => b.gain - a.gain || a.san.localeCompare(b.san));
}
