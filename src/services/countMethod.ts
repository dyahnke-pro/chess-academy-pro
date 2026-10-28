// COUNT BEFORE YOU TAKE (WO-TEACH-GAPS P3, "how to calculate — count,
// visualise, blunder-check": the counting half). Said only AFTER a student move
// the count would have stopped (David 2026-10-28: "This should only fire if a
// capture is made without the correct amount of pieces, or if you move to a
// square without proper number of defense"):
//   - a capture on a square they did not outnumber, which lost material;
//   - a move onto a square their pieces cannot hold, where the piece is lost.
// Never on a good move, never as a forecast ("Count before you take on d4 …
// the trades come out in your favour" spoke before a correct recapture).
//
// Said only when the raw count, the legal exchange (pins and all) and the
// engine's price all agree, so the count never teaches a wrong answer: a sound
// sacrifice loses the count and wins the game, and the engine says so. Names
// the square; the move is already played. Once per square (`countKey`).
//
// A LEAF: chess.js + the legal SEE.
import { Chess, type Color } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { signedLegalSeeFor } from './positionReadingService';
import { MISTAKE_CP } from './engineConstants';
import { PIECE_NAMES } from '../types/tacticTypes';
import { countWord } from '../utils/andList';

interface CountMethod { text: string; square: string; /** The exchange's net for the student, in points (signed SEE). */ net: number }

/** The student's move `playedSan` from `fenBefore`, read against the count.
 *  `costCp` is the engine's price of the move (REQUIRED; null = not priced,
 *  and an unpriced move is never called wrong). */
export function countMethod(fenBefore: string, playedSan: string, student: Color, costCp: number | null): CountMethod | null {
  if (costCp === null || costCp < MISTAKE_CP) return null;
  let before: Chess;
  let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return null; }
  if (before.turn() !== student) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  let m: ReturnType<Chess['move']>;
  try { m = after.move(playedSan); } catch { return null; }
  if (!m || m.piece === 'k' || m.isEnPassant()) return null;
  const sq = m.to;
  if (m.captured) {
    const att = before.attackers(sq, student).length;
    const def = before.attackers(sq, foe).length;
    if (def === 0 || att > def) return null;
    const net = (MATERIAL_VALUE[m.captured] ?? 0) - Math.max(0, signedLegalSeeFor(after.fen(), sq, foe));
    if (net >= 0) return null;
    return { square: sq, net, text: `Count before you take on ${sq}: ${countWord(att)} of your pieces ${att === 1 ? 'hits' : 'hit'} it and ${countWord(def)} of theirs ${def === 1 ? 'defends' : 'defend'} it. Not enough — the trades there leave you behind.` };
  }
  const att = after.attackers(sq, foe).length;
  const def = after.attackers(sq, student).length;
  if (att === 0 || att <= def) return null;
  const gain = signedLegalSeeFor(after.fen(), sq, foe);
  if (gain <= 0) return null;
  const piece = PIECE_NAMES[m.piece] ?? 'piece';
  const guards = def === 0 ? 'none of yours guard it' : `only ${countWord(def)} of yours ${def === 1 ? 'guards' : 'guard'} it`;
  return { square: sq, net: -gain, text: `Count before you put your ${piece} on ${sq}: ${countWord(att)} of theirs ${att === 1 ? 'hits' : 'hit'} it and ${guards}. Not enough — the ${piece} is lost in the trades.` };
}

/** The ASKED form ("what should I watch?"): a capture the student could make
 *  now that the count says loses. Only for an answer the student asked for —
 *  never spoken unasked. */
export function countWarning(fen: string, student: Color): CountMethod | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== student || c.inCheck()) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  const targets = c.board().flat()
    .filter((p): p is NonNullable<typeof p> => !!p && p.color === foe && p.type !== 'k')
    .sort((a, b) => (MATERIAL_VALUE[b.type] ?? 0) - (MATERIAL_VALUE[a.type] ?? 0));
  for (const t of targets) {
    const att = c.attackers(t.square, student).length;
    const def = c.attackers(t.square, foe).length;
    if (att < 2 || def < 2 || att > def) continue;
    const net = signedLegalSeeFor(fen, t.square, student);
    if (net < 0) {
      return { square: t.square, net, text: `Count before you take on ${t.square}: ${countWord(att)} attackers against ${countWord(def)} defenders. Not enough — start the trades there and you come out behind.` };
    }
  }
  return null;
}
