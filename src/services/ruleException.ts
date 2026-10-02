// A RULE AND ITS EXCEPTION (census #10, 232 of his lines): "Moving a piece
// twice is usually wrong, but a lead in development buys you that liberty",
// "a bishop to c6 first, because it hits g2", "pushing pawns in front of your
// king doesn't automatically get you mated", "f4 chases the knight — it does
// loosen your own position a touch".
//
// The student's move breaks a rule every beginner is taught, the engine agrees
// with it anyway (the caller passes only moves within 20cp of best), and the
// board says why HERE. Three rules, each with a computed reason:
//   · the same minor piece twice in the opening — not a forced retreat — when
//     it hits something or the development lead pays for it;
//   · an f- or g-pawn in front of your castled king, their queen on, when it
//     hits something or the centre is closed (h3/h6 against a pinning bishop
//     is routine, not a rule broken);
//   · the queen out by move ten with two minors at home, when it hits
//     something.
// "Hits" = attacks a piece worth more than the mover, or one it wins by
// exchange count. Null without a reason — a rule broken for no visible reason
// is the engine's secret, not a lesson.
//
// Measured on 80 of his speedrun games: 10 lines, about his own rate.
import { Chess, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { shelterSquares } from './kingSafety';
import { CAPTURE_VALUE } from './pieceValues';

export interface RuleException {
  rule: 'twice' | 'shield-pawn' | 'early-queen';
  text: string;
  squares: string[];
}

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MINOR_HOME: Record<'w' | 'b', readonly string[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] };

function minorsAtHome(c: Chess, color: 'w' | 'b'): number {
  return MINOR_HOME[color].filter((sq) => {
    const p = c.get(sq as Square);
    return !!p && p.color === color && (p.type === 'n' || p.type === 'b');
  }).length;
}

/** The enemy piece the moved piece now goes after: worth more than the mover,
 *  or won outright by exchange count. */
function hitBy(after: Chess, sq: string, me: 'w' | 'b'): { sq: string; type: string } | null {
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const mover = after.get(sq as Square);
  if (!mover) return null;
  for (const row of after.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== them || cell.type === 'k') continue;
      if (!after.attackers(cell.square, me).includes(sq as Square)) continue;
      if (CAPTURE_VALUE[cell.type] > CAPTURE_VALUE[mover.type] || legalSeeGainFor(after.fen(), cell.square, me) > 0) {
        return { sq: cell.square, type: cell.type };
      }
    }
  }
  return null;
}

/** Both central files locked: a white pawn directly in front of a black one. */
function centreClosed(c: Chess): boolean {
  return ['d', 'e'].every((f) => {
    for (let r = 2; r <= 6; r++) {
      const w = c.get(`${f}${r}` as Square);
      const b = c.get(`${f}${r + 1}` as Square);
      if (w?.type === 'p' && w.color === 'w' && b?.type === 'p' && b.color === 'b') return true;
    }
    return false;
  });
}

/**
 * `historySans` is every move of the game BEFORE the played one — needed to
 * know whether this piece has moved already.
 */
export function ruleException(fenBefore: string, san: string, historySans: readonly string[]): RuleException | null {
  let before: Chess; let after: Chess; let mv;
  try {
    before = new Chess(fenBefore);
    after = new Chess(fenBefore);
    mv = after.move(san);
    if (!mv) return null;
  } catch { return null; }
  if (after.isCheckmate()) return null;
  const me = mv.color;
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const fullmove = Number(fenBefore.split(' ')[5] ?? 1);
  const played = `${me === 'b' ? '…' : ''}${mv.san}`;
  const hit = mv.captured ? null : hitBy(after, mv.to, me);
  const hitWords = hit ? `it hits the ${NAME[hit.type]} on ${hit.sq}` : null;
  const squares = [mv.to, ...(hit ? [hit.sq] : [])];

  // The same minor piece twice in the opening.
  if (fullmove <= 12 && !mv.captured && (mv.piece === 'n' || mv.piece === 'b')) {
    const g = new Chess();
    let movedBefore = false;
    try {
      for (const s of historySans) {
        const m = g.move(s);
        if (m.color === me && m.to === mv.from && m.piece === mv.piece) movedBefore = true;
      }
    } catch { return null; }
    // The history must lead to this very board, or "moved before" is a guess.
    const sameBoard = g.fen().split(' ')[0] === fenBefore.split(' ')[0];
    // A piece under attack that steps away is not wasting a tempo — it had to.
    const wasHit = before.attackers(mv.from, them).length > 0;
    if (movedBefore && sameBoard && !wasHit && minorsAtHome(before, me) >= 1) {
      const lead = minorsAtHome(before, them) - minorsAtHome(before, me);
      const why = hitWords ?? (lead >= 2 ? 'your lead in development buys you the time' : null);
      if (why) {
        return { rule: 'twice', text: `${played} moves the same piece twice — usually a waste of time in the opening, but here ${why}.`, squares };
      }
    }
  }

  // An f- or g-pawn in front of your own castled king, their queen still on.
  const theirQueen = after.board().flat().some((x) => x?.type === 'q' && x.color === them);
  if (mv.piece === 'p' && !mv.captured && theirQueen && /^[fg]/.test(mv.from)) {
    let king = '';
    for (const row of before.board()) for (const cell of row) if (cell?.type === 'k' && cell.color === me) king = cell.square;
    if (king && shelterSquares(king, me)?.includes(mv.from)) {
      const why = hitWords ?? (centreClosed(after) ? 'with the centre closed, your king can live with it' : null);
      if (why) {
        return { rule: 'shield-pawn', text: `${played} loosens your own king — normally a pawn move to avoid, but here ${why}.`, squares };
      }
    }
  }

  // The queen out early.
  if (mv.piece === 'q' && fullmove <= 10 && minorsAtHome(before, me) >= 2 && hit && hitWords) {
    return { rule: 'early-queen', text: `An early queen move usually just gets kicked around — but ${played} earns it: ${hitWords}.`, squares };
  }
  return null;
}
