// pawnBreak — THE PAWN BREAK AND WHAT IT OPENS (2026-11-05, the teaching move
// S-BREAK in `teachingMoves.ts`). A strong coach names a break as a break and
// says what it is for: the file it opens for a rook, the diagonal it frees for
// a bishop. The app knew a move was a break (`isPawnBreak`, read by the games'
// plans) and never said what the break opened.
//
// Read on the board, both seats, exactly (chess.js, no engine): a break that
// takes a pawn, or a break their pawn can take — and on the board after that
// trade, the file the mover's rook now looks down (no pawn of the mover's left
// on it) and the bishop of the mover's that sees at least three more squares
// than it did with the break pawn still standing. Null when the trade opens
// nothing for a piece of the mover's: a break that opens no line is a pawn
// move, not a lesson. Measured on the moves of his games (2026-11-05): it
// fires on one move in nine where his words name the break, and on one move in
// a hundred and fifty elsewhere — each of those a real break.
//
// PURE: chess.js and the proof shape.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalLineProof, type Proof } from './proof';
import { andList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';

/** A pawn move that STARTS a fight with an enemy pawn: it takes one that has
 *  stood its ground, attacks one, or lands where one attacks it. Taking what
 *  the opponent's last move put there — a recapture, or the lever they just
 *  pushed, en passant included — answers their break; it is not one
 *  (2026-10-29: "the axb4 break", played in every game, was the recapture of
 *  …cxb4; the Najdorf's "…dxe5 break" took the e5 pawn White had just pushed).
 *  `lastTo` is the square the opponent's last move landed on, null at the
 *  start. THE ONE DEFINITION — the games' plans (`computedPlan`) read it here. */
export function isPawnBreak(fenBefore: string, san: string, lastTo: string | null): boolean {
  const c = new Chess(fenBefore);
  let mv;
  try { mv = c.move(san); } catch { return false; }
  if (mv.piece !== 'p') return false;
  if (mv.captured && (mv.to === lastTo || mv.isEnPassant())) return false;
  if (mv.captured === 'p') return true;
  const them = mv.color === 'w' ? 'b' : 'w';
  const file = mv.to.charCodeAt(0);
  const rank = Number(mv.to[1]);
  const ahead = mv.color === 'w' ? rank + 1 : rank - 1;
  for (const df of [-1, 1]) {
    const f = String.fromCharCode(file + df);
    if (f < 'a' || f > 'h') continue;
    const hits = c.get(`${f}${ahead}` as Square);
    if (hits && hits.type === 'p' && hits.color === them) return true;
  }
  return c.attackers(mv.to, them).some((sq) => c.get(sq)?.type === 'p');
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const FILES = 'abcdefgh';
/** The opening's own pawn trades are its theory (the opening's story says
 *  them); a break is a middlegame decision, from this move number on. */
const BREAK_FROM_MOVE = 8;
/** How many more squares a bishop must see for the trade to have freed it. */
const FREED_SQUARES = 3;

export interface PawnBreak {
  text: string;
  /** The break, the pawn it strikes, and the pieces the trade opens lines for. */
  squares: string[];
  /** The break and the capture that trades the pawns, played from the board. */
  proof: Proof | null;
  key: string;
}

/** How many squares the piece on `sq` attacks on `board`. */
function reach(board: Chess, sq: Square, color: Color): number {
  let n = 0;
  for (const f of FILES) {
    for (let r = 1; r <= 8; r += 1) {
      const s = `${f}${r}` as Square;
      if (s !== sq && board.attackers(s, color).includes(sq)) n += 1;
    }
  }
  return n;
}

function pawnsOnFile(board: Chess, file: string, color: Color): number {
  let n = 0;
  for (let r = 1; r <= 8; r += 1) {
    const p = board.get(`${file}${r}` as Square);
    if (p && p.type === 'p' && p.color === color) n += 1;
  }
  return n;
}

/**
 * The pawn break `san` on `fenBefore`, read for what the pawn trade opens for
 * the mover. `whose` words it from the mover's seat ('your' when the student
 * moved). `lastTo` — the square the opponent's last move landed on (a
 * recapture is no break).
 */
export function pawnBreak(fenBefore: string, san: string, whose: 'your' | 'their', lastTo: string | null): PawnBreak | null {
  if (Number(fenBefore.split(' ')[5] ?? '1') < BREAK_FROM_MOVE) return null;
  if (!isPawnBreak(fenBefore, san, lastTo)) return null;
  let after: Chess;
  let mv;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  // A check or a promotion has its own story.
  if (!mv || mv.promotion || after.inCheck()) return null;
  const me = mv.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  // THE TRADE: the break takes a pawn, or their pawn can take the break pawn.
  let traded: Chess;
  let line: string[];
  let struck: string;
  if (mv.captured === 'p') {
    traded = after;
    line = [mv.san];
    struck = mv.to;
  } else {
    const take = after.moves({ verbose: true }).find((m) => m.piece === 'p' && m.to === mv.to);
    if (!take) return null;
    traded = new Chess(after.fen());
    traded.move(take.san);
    line = [mv.san, take.san];
    struck = take.from;
  }
  // WHAT THE TRADE OPENS — against the board with the break pawn still
  // standing, so a line the push itself opened is not credited to the trade.
  const opens: Array<{ text: string; squares: string[] }> = [];
  for (const f of [...new Set([mv.from[0], mv.to[0], struck[0]])]) {
    if (pawnsOnFile(after, f, me) === 0 || pawnsOnFile(traded, f, me) > 0) continue;
    const rooks: string[] = [];
    for (let r = 1; r <= 8; r += 1) {
      const s = `${f}${r}` as Square;
      const p = traded.get(s);
      if (p && p.color === me && p.type === 'r') rooks.push(s);
    }
    if (rooks.length === 0) continue;
    const open = pawnsOnFile(traded, f, them) === 0;
    opens.push({ text: `${open ? 'opens' : 'half-opens'} the ${f}-file for ${whose} rook on ${rooks[0]}`, squares: rooks });
  }
  for (const row of traded.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== me || cell.type !== 'b') continue;
      if (reach(traded, cell.square, me) - reach(after, cell.square, me) >= FREED_SQUARES) {
        opens.push({ text: `frees ${whose} ${NAME.b} on ${cell.square}`, squares: [cell.square] });
      }
    }
  }
  if (opens.length === 0) return null;
  const lead = `${me === 'b' ? '…' : ''}${mv.san}`;
  const theirs = whose === 'your' ? 'their' : 'your';
  const taker = whose === 'your' ? 'they take' : 'you take';
  const what = andList(opens.map((o) => o.text));
  const text = openSentence(mv.captured === 'p'
    ? `${lead} is a pawn break: it takes ${theirs} pawn on ${mv.to} and ${what}.`
    : `${lead} is a pawn break: it strikes ${theirs} pawn on ${struck}, and if ${taker}, the trade ${what}.`);
  return {
    text,
    squares: [...new Set([mv.from, mv.to, struck, ...opens.flatMap((o) => o.squares)])],
    proof: legalLineProof(fenBefore, line, whose === 'your' ? 'you' : 'they'),
    key: `pawn-break:${mv.from}${mv.to}`,
  };
}
