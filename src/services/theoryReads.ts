// THE THEORY READERS the composer speaks beside the plan and the decision
// (round 10, David 2026-11-26: structure, move order, gambit, endgame on the
// theory surfaces too). Pure over chess.js and the one computers that already
// own each fact: `namedStructure`, `boardStructure`, `openingEquivalence`. A
// reader returns a sentence only when the move CHANGED the board that way —
// never a standing description repeated every move.
import { Chess, type Color } from 'chess.js';
import { namedStructureFormed, namedStructureLine } from './namedStructure';
import { lockedPawnPairs, structureSignature } from './boardStructure';
import { openingEquivalence } from './openingEquivalence';

export interface TheoryRead { text: string; squares: string[] }

const FILE_NAME: Record<string, string> = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h' };

/** The pawn structure the move made: a NAMED one (Carlsbad, Maroczy…), else a
 *  locked centre, an isolated central pawn, doubled pawns or a newly open file. */
export function structureRead(i: { fenBefore: string; san: string; mover: Color }): TheoryRead | null {
  const named = namedStructureFormed(i.fenBefore, i.san);
  if (named) return { text: namedStructureLine(named, i.mover), squares: named.squares };
  let after: Chess;
  try { after = new Chess(i.fenBefore); after.move(i.san); } catch { return null; }
  const was = structureSignature(i.fenBefore);
  const now = structureSignature(after.fen());
  if (!was || !now) return null;
  if (now.lockedCenter && !was.lockedCenter) {
    const pairs = lockedPawnPairs(after).filter((p) => 'cdef'.includes(p.white[0]));
    return { text: `The centre is locked: ${pairs.map((p) => `${p.white} and ${p.black}`).join(' and ')} face each other, so neither side can push there and the play moves to the wings.`, squares: pairs.flatMap((p) => [p.white, p.black]) };
  }
  if (now.iqp && !was.iqp) return { text: 'That leaves an isolated pawn in the centre: it grips the squares in front of it, but it has no pawn to guard it, so its pieces must.', squares: [] };
  if (now.doubled && !was.doubled) return { text: 'That doubles a pawn: a weakness to aim at, paid for with an open file.', squares: [] };
  const opened = now.openFiles.filter((f) => !was.openFiles.includes(f));
  if (opened.length) return { text: `The ${opened.map((f) => FILE_NAME[f] ?? f).join(' and ')}-file is open now: that is where rooks belong.`, squares: [] };
  return null;
}

/** A pawn the move offers: the opponent can take it and nothing takes back. */
export function gambitRead(i: { fenBefore: string; san: string; mover: Color }): TheoryRead | null {
  let c: Chess;
  try { c = new Chess(i.fenBefore); c.move(i.san); } catch { return null; }
  const them: Color = i.mover === 'w' ? 'b' : 'w';
  for (const m of c.moves({ verbose: true })) {
    if (m.captured !== 'p' || m.color !== them) continue;
    const t = new Chess(c.fen());
    t.move(m.san);
    if (t.attackers(m.to, i.mover).length === 0) {
      return { text: `It offers the pawn on ${m.to}. That is a gambit: the pawn is given for time and open lines, and the pawn can be taken because nothing takes the capturing piece back.`, squares: [m.to] };
    }
  }
  return null;
}

/** The queens come off: the game turns toward an endgame. */
export function endgameRead(i: { fenBefore: string; san: string }): TheoryRead | null {
  const was = structureSignature(i.fenBefore);
  let after: string;
  try { const c = new Chess(i.fenBefore); c.move(i.san); after = c.fen(); } catch { return null; }
  const now = structureSignature(after);
  if (!was || !now || !was.queensOn || now.queensOn) return null;
  return { text: 'The queens come off, so the game heads for an endgame: the pawn structure and an active king decide it now.', squares: [] };
}

/** The board is a named opening reached another way, or the same one with the
 *  colours reversed — the move order matters. */
export function moveOrderRead(i: { history: readonly string[]; student: Color }): TheoryRead | null {
  const eq = openingEquivalence(i.history, i.student);
  return eq ? { text: eq.text, squares: eq.squares } : null;
}
