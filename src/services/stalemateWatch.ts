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
