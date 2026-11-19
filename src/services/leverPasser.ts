// leverPasser — THE PAWN LEVER THAT MAKES A PASSED PAWN (Danya have-check, 2026-11-19).
//
// Danya: "White threatens the thematic a5: create an outside passer, deflect
// Black's king, then eat the kingside"; "Black's answer is a kingside pawn
// breakthrough, giving up pawns to make an unstoppable passer"; "Bf3 followed
// by d5, when the pawn armada tears Black apart". The passer reads see a
// passed pawn once it is on the board; nothing read the push that MAKES one.
//
// Read off the engine's best line, chess.js only: its first move — or the
// other side's lever inside it — is a pawn move that touches an enemy pawn (a capture, or a push that attacks one or
// is attacked by one), and within the line's first ten moves the mover gets
// a passed pawn it did not have (by file) before the push, still passed at the
// line's end. The side to move stands at least level by the line. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, lineScore, other, playLine, sortedLines } from './engineLineRead';

export interface LeverPasser { side: Color; lever: string; passer: Square; ply: number; text: string; squares: Square[] }

const FILES = 'abcdefgh';

function passedPawns(c: Chess, col: Color): Square[] {
  const out: Square[] = [];
  for (const p of c.board().flat()) {
    if (!p || p.type !== 'p' || p.color !== col) continue;
    const f = FILES.indexOf(p.square[0]); const r = Number(p.square[1]);
    let free = true;
    for (const df of [-1, 0, 1]) {
      const ff = f + df; if (ff < 0 || ff > 7) continue;
      for (let rr = 1; rr <= 8 && free; rr++) {
        if (col === 'w' ? rr <= r : rr >= r) continue;
        const q = c.get(`${FILES[ff]}${rr}` as Square);
        if (q && q.type === 'p' && q.color !== col) free = false;
      }
    }
    if (free) out.push(p.square);
  }
  return out;
}

export function leverPasser(fen: string, lines: readonly EngineLine[], student: Color): LeverPasser | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const ls = sortedLines(lines, side);
  if (!ls.length || lineScore(ls[0], side) < -30) return null;
  const { moves, boards } = playLine(fen, ls[0].moves, 10);
  // The side to move's first move, or the other side's lever inside the line
  // (their threat: the best line has to allow it).
  for (let i = 0; i < Math.min(moves.length, 6); i++) {
    const lever = moves[i];
    if (lever.piece !== 'p' || (i > 0 && lever.color === side)) continue;
    const mover = lever.color;
    const after = new Chess(boards[i + 1]);
    const touches = lever.captured === 'p'
      || after.board().flat().some((p) => p && p.type === 'p' && p.color !== mover && (after.attackers(p.square, mover).includes(lever.to) || after.attackers(lever.to, other(mover)).includes(p.square)));
    if (!touches) continue;
    const filesBefore = new Set(passedPawns(new Chess(boards[i]), mover).map((x) => x[0]));
    const end = new Chess(boards[boards.length - 1]);
    for (let j = i + 1; j < boards.length; j++) {
      // The lever's own wing: the new passer on the push's file or the next one.
      const fresh = passedPawns(new Chess(boards[j]), mover).filter((x) => !filesBefore.has(x[0]) && Math.abs(FILES.indexOf(x[0]) - FILES.indexOf(lever.to[0])) <= 1);
      // The pawn has to live: still passed at the end of the line read.
      const passer = fresh.find((x) => passedPawns(end, mover).some((e) => e[0] === x[0]));
      if (!passer) continue;
      const yours = mover === student;
      const text = yours
        ? `${lever.san} is the lever: after the trades it starts, you get a passed pawn on the ${passer[0]}-file. That passer is the point of the push.`
        : `Watch their ${lever.san}: it is a lever, and after the trades it starts they get a passed pawn on the ${passer[0]}-file.`;
      return { side: mover, lever: lever.san, passer, ply: j, text, squares: [lever.from, lever.to, passer] };
    }
  }
  return null;
}
