// boardPlan — structure→plan clause (Phase 1 slice, the CAMPAIGN line of the
// general's briefing). Names the textbook plan a CLEAR pawn structure dictates,
// board-true and conservative: only the unambiguous, canonical cases (a passed
// pawn, an isolated queen's pawn) — where the plan is settled theory, not a
// judgment call. When the structure is ambiguous it returns null (empty > a
// generic "improve your pieces", per "when unsure, leave blank"). G0/G3: the
// structure comes from chess.js geometry (describeStructure); the plan is the
// established idea for that structure, phrased in code.
import { Chess, type Square } from 'chess.js';
import { describeStructure } from './boardStructure';

type Color = 'w' | 'b';

/** Rank distance to promotion for a pawn square, by colour (0 = about to queen). */
function stepsToPromote(square: string, color: Color): number {
  const rank = Number.parseInt(square[1] ?? '2', 10);
  return color === 'w' ? 8 - rank : rank - 1;
}

const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The square directly in front of a pawn (toward promotion), or null off-board. */
function frontSquare(square: string, color: Color): string | null {
  const file = square[0];
  const rank = Number.parseInt(square[1] ?? '0', 10);
  const nr = color === 'w' ? rank + 1 : rank - 1;
  if (nr < 1 || nr > 8) return null;
  return `${file}${nr}`;
}

/** What blocks a passer's advance: 'clear' (front empty, push it), 'enemy' (a
 *  blockader sits in front — the push is stopped), or 'friendly' (self-blocked).
 *  Board-true via chess.js so the plan never says "push it" on a pawn that can't
 *  move (B#4). Returns the blocker's piece letter when occupied. */
function passerBlock(fen: string, square: string, color: Color): { kind: 'clear' | 'enemy' | 'friendly'; piece?: string } {
  const front = frontSquare(square, color);
  if (!front) return { kind: 'clear' }; // already on the promotion rank — nothing ahead
  try {
    const occ = new Chess(fen).get(front as Square);
    if (!occ) return { kind: 'clear' };
    return { kind: occ.color === color ? 'friendly' : 'enemy', piece: occ.type };
  } catch { return { kind: 'clear' }; }
}

/** The most advanced pawn square in a list, for the given colour. */
function mostAdvanced(squares: string[], color: Color): string | null {
  if (squares.length === 0) return null;
  return [...squares].sort((a, b) => stepsToPromote(a, color) - stepsToPromote(b, color))[0];
}

/** Is a square the d- or e-file (the queen's/king's-pawn isolani — the one
 *  whose plan is textbook). */
function isCentralFile(square: string): boolean {
  return square[0] === 'd' || square[0] === 'e';
}

/**
 * The plan the structure dictates for the STUDENT, or null when the structure
 * has no canonical single plan. Priority: a passed pawn (yours = push, theirs =
 * blockade) outranks an isolani read, because a passer is the more forcing
 * feature.
 */
export function structurePlan(fen: string, studentColor: Color): string | null {
  const s = describeStructure(fen);
  if (!s) return null;
  const opp: Color = studentColor === 'w' ? 'b' : 'w';

  // Passed pawns — the most forcing structural feature. But "push it" is only
  // honest when the pawn can actually advance (B#4): a blockaded passer needs the
  // blockader challenged first, and a self-blocked one needs its path cleared.
  const mine = mostAdvanced(s.pawns.passedPawns[studentColor], studentColor);
  if (mine) {
    const block = passerBlock(fen, mine, studentColor);
    if (block.kind === 'enemy') {
      return `Your passed pawn on ${mine} is a trump, but their ${PIECE_NOUN[block.piece ?? 'p']} blockades it — challenge or dislodge that blockader before it can run.`;
    }
    if (block.kind === 'friendly') {
      return `Your passed pawn on ${mine} is a trump, but your own ${PIECE_NOUN[block.piece ?? 'p']} sits in its path — clear the way before it can advance.`;
    }
    return `Your passed pawn on ${mine} is the trump here — push it and make them deal with the promotion.`;
  }
  const theirs = mostAdvanced(s.pawns.passedPawns[opp], opp);
  if (theirs) {
    return `Their passed pawn on ${theirs} is the danger — get a piece in front of it and blockade before it runs.`;
  }

  // Isolated queen's/king's pawn — the classic IQP plan.
  const myIso = s.pawns.isolatedPawns[studentColor].filter(isCentralFile)[0];
  if (myIso) {
    return `You're playing with the isolated pawn on ${myIso} — keep pieces on and use the open lines for activity; don't drift into the endgame where it's a target.`;
  }
  const theirIso = s.pawns.isolatedPawns[opp].filter(isCentralFile)[0];
  if (theirIso) {
    return `They have the isolated pawn on ${theirIso} — trade pieces and pile onto it; the endgame is where it falls.`;
  }

  return null;
}
