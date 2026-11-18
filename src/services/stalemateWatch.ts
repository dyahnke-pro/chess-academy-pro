// STALEMATE WATCH (WO-TEACH-GAPS P2 #9 — the half of converting that
// `conversionMethod` never says). When you are winning, the one way to throw it
// all away in a single move is to leave their king no square while nothing else
// of theirs can move. He says it before it happens: "careful, don't stalemate".
//
// Student to move, ahead by at least a minor piece, and at least one of the
// student's legal moves stalemates them. Names EVERY such move (no cap, G4.5):
// the warning is only useful if it covers the move the student was about to
// play. Board-true: chess.js plays each move and asks `isStalemate`.
//
// A LEAF: chess.js + the structure reader.
import { Chess } from 'chess.js';
import { describeStructure } from './boardStructure';
import { CONVERSION_EDGE } from './conversionMethod';
import { orList } from '../utils/andList';

interface StalemateWatch {
  text: string;
  /** Destination squares of the stalemating moves. */
  squares: string[];
  moves: string[];
}

export function stalemateWatch(fen: string, student: 'w' | 'b'): StalemateWatch | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== student) return null;
  const s = describeStructure(fen);
  if (!s) return null;
  const edge = student === 'w' ? s.material.balance : -s.material.balance;
  if (edge < CONVERSION_EDGE) return null;
  const traps: { san: string; to: string }[] = [];
  for (const m of c.moves({ verbose: true })) {
    const b = new Chess(fen);
    b.move(m.san);
    if (b.isStalemate()) traps.push({ san: m.san, to: m.to });
  }
  if (traps.length === 0) return null;
  const sans = traps.map((t) => t.san);
  const verb = sans.length === 1 ? 'would be' : 'would all be';
  const text = `Careful — ${orList(sans)} ${verb} stalemate: their king would have no square and nothing else of theirs could move. Winning on the board is not a win until it is mate, so leave the king a square.`;
  return { text, squares: [...new Set(traps.map((t) => t.to))], moves: sans };
}

/** THE STALEMATE TRICK (David 2026-11-17, WO-TIE-01: the losing side's half of
 *  the watch — Danya's "the desperado rook: take it and it is stalemate"). The
 *  mover is behind by at least a minor piece and their move leaves the other
 *  side a capture that stalemates them: take the bait and the game is drawn.
 *  Both seats: for the losing side it is a chance to save the game, for the
 *  winning side the capture to leave alone. Board-true: chess.js plays every
 *  reply and asks `isStalemate`. Names every such capture (no cap, G4.5). */
export interface StalemateTrick {
  /** The side that set the trick (the one behind). */
  side: 'w' | 'b';
  /** The captures that stalemate it, SAN on the board after the move. */
  captures: string[];
  /** The squares the bait stands on. */
  squares: string[];
  key: string;
}

export function stalemateTrick(fenBefore: string, san: string): StalemateTrick | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const side = c.turn();
  const s = describeStructure(fenBefore);
  if (!s) return null;
  const behind = side === 'w' ? -s.material.balance : s.material.balance;
  if (behind < CONVERSION_EDGE) return null;
  try { c.move(san.replace(/[!?]+$/, '')); } catch { return null; }
  if (c.isGameOver()) return null;
  const fenAfter = c.fen();
  const baits: { san: string; to: string }[] = [];
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured) continue;
    const b = new Chess(fenAfter);
    b.move(m.san);
    if (b.isStalemate()) baits.push({ san: m.san, to: m.to });
  }
  if (baits.length === 0) return null;
  const squares = [...new Set(baits.map((b) => b.to))];
  return { side, captures: baits.map((b) => b.san), squares, key: `stalemate-trick:${fenAfter.split(' ')[0]}` };
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A NATURAL MOVE THAT WALKS INTO A STALEMATE TRICK, two moves deep (Saavedra
 *  review 2026-11-18: after …Rd4, c8=Q runs into …Rc4+ and Qxc4 is
 *  stalemate). `natural` is the move, `check` their check that offers a piece,
 *  `capture` the capture of it that stalemates. Board-true: chess.js plays
 *  every move and asks `isStalemate`. */
export interface StalemateTrap {
  natural: string;
  check: string;
  capture: string;
  /** The natural move's square and the bait's square. */
  squares: string[];
  /** The checking piece — the bait — and the square it checks from. */
  bait: string;
  checkFrom: string;
  /** Who would play the natural move (and fall in). */
  side: 'w' | 'b';
}

/** The trick in words, from the student's seat: `mine` when the student set it. */
export function stalemateTrickLine(t: StalemateTrick, mine: boolean, fenAfter: string): string {
  let c: Chess | null = null;
  try { c = new Chess(fenAfter); } catch { c = null; }
  const baitWords = t.squares.map((sq) => {
    const p = c?.get(sq as Parameters<Chess['get']>[0]);
    return p ? `the ${PIECE_NAME[p.type]} on ${sq}` : sq;
  });
  const bait = orList(baitWords);
  return mine
    ? `You are behind, but there is a trick: if they take ${bait}, it is stalemate. Your king would have no move and nothing else of yours could move, so the game is drawn.`
    : `Careful — taking ${bait} would be stalemate. Their king would have no move and nothing else of theirs could move, so a won game becomes a draw. Leave the bait alone.`;
}

/** Every natural move (a promotion or a capture) of the side to move on `fen`
 *  that walks into a stalemate trick: a check that offers a piece whose capture
 *  stalemates the checker. `only`, when given, limits the moves read. */
export function stalemateTraps(fen: string, only?: readonly string[]): StalemateTrap[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  const out: StalemateTrap[] = [];
  const bare = (x: string): string => x.replace(/[+#!?]+$/, '');
  for (const m of c.moves({ verbose: true })) {
    if (only ? !only.some((o) => bare(o) === bare(m.san)) : !(m.promotion || m.captured)) continue;
    const a = new Chess(fen); a.move(m.san);
    if (a.isGameOver()) continue;
    for (const ch of a.moves({ verbose: true })) {
      if (!ch.san.includes('+')) continue;
      const b = new Chess(a.fen()); b.move(ch.san);
      for (const cap of b.moves({ verbose: true })) {
        if (!cap.captured || cap.to !== ch.to) continue;
        const d = new Chess(b.fen()); d.move(cap.san);
        if (d.isStalemate()) out.push({ natural: m.san, check: ch.san, capture: cap.san, squares: [m.to, ch.to], bait: PIECE_NAME[ch.piece], checkFrom: ch.from, side: m.color });
      }
    }
  }
  return out;
}

/** THEIR MOVE SETS THE TRAP — the two-move stalemate trick in words, from the
 *  student's seat (`student` is the student's colour). The underpromotion
 *  that dodges it is said by `promotionChoice`. */
export function stalemateTrapLine(trap: StalemateTrap, student: 'w' | 'b'): string {
  const dot = (san: string, side: 'w' | 'b'): string => `${side === 'b' ? '…' : ''}${san}`;
  const other: 'w' | 'b' = trap.side === 'w' ? 'b' : 'w';
  const natural = dot(trap.natural, trap.side);
  const check = dot(trap.check, other);
  const capture = dot(trap.capture, trap.side);
  return trap.side === student
    ? `Their move sets a stalemate trap: if you play ${natural}, ${check} comes, and taking the ${trap.bait} with ${capture} is stalemate — a won game drawn.`
    : `You set a stalemate trap: if they play ${natural}, ${check} comes, and taking your ${trap.bait} with ${capture} is stalemate.`;
}
