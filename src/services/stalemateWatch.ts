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

export interface StalemateWatch {
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
