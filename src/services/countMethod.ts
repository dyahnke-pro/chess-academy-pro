// COUNT BEFORE YOU TAKE (WO-TEACH-GAPS P3, "how to calculate — count,
// visualise, blunder-check": the counting half, live). Before an exchange on a
// square, count the attackers and the defenders. Earned only when the board
// makes the count matter: the student is to move and a square holding one of
// their pieces' targets is hit at least twice and defended at least twice. Said
// ONLY when the raw count and the legal exchange (pins and all) agree, so the
// count never teaches a wrong answer. Names the square, never the move. Once
// per game (claim `count-method`).
//
// A LEAF: chess.js + the legal SEE.
import { Chess, type Color } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { signedLegalSeeFor } from './positionReadingService';

export interface CountMethod { text: string; square: string }

export function countMethod(fen: string, student: Color): CountMethod | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== student || c.inCheck()) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  const targets = c.board().flat()
    .filter((p): p is NonNullable<typeof p> => !!p && p.color === foe && p.type !== 'k')
    .sort((a, b) => (MATERIAL_VALUE[b.type] ?? 0) - (MATERIAL_VALUE[a.type] ?? 0));
  for (const t of targets) {
    const sq = t.square;
    const att = c.attackers(sq, student).length;
    const def = c.attackers(sq, foe).length;
    if (att < 2 || def < 2) continue;
    const net = signedLegalSeeFor(fen, sq, student);
    if (att > def && net > 0) {
      return { square: sq, text: `Count before you take on ${sq}: ${att} of your pieces hit it and ${def} of theirs defend it. More attackers than defenders, and the trades there come out in your favour.` };
    }
    if (att <= def && net < 0) {
      return { square: sq, text: `Count before you take on ${sq}: ${att} attackers against ${def} defenders. Not enough — start the trades there and you come out behind.` };
    }
  }
  return null;
}
