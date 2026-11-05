// pawnBreak — THE PAWN BREAK AND WHAT IT IS FOR (2026-11-05, the teaching move
// S-BREAK in `teachingMoves.ts`). A strong coach names a break as a break and
// says what it is for: the pawn it strikes (the base of their chain, their
// centre), the file it opens for the rooks, the diagonal it frees for a
// bishop, the file it opens toward their king. The app knew a move was a
// break (`isPawnBreak`, read by the games' plans) and never said what for.
//
// Read on the board, both seats, exactly (chess.js, no engine): a break that
// takes a pawn, or a break their pawn can take. What it is for is read twice:
// on the pawn it strikes, as the board stands (the base of a pawn chain — a
// pawn that holds another and that no pawn holds; a centre pawn); and on the
// board after the trade, against the board with the break pawn still
// standing, so nothing the push itself did is credited to the trade — a file
// with no pawn of the mover's left on it (the rooks' file, toward their king
// when it runs beside their king) and a bishop that sees at least three more
// squares. Null when it is for none of these: a break that strikes nothing
// that matters and opens nothing is a pawn move, not a lesson.
//
// Measured on the moves of his games (2026-11-05, his tagged speedruns, 7,333
// game moves): the reader fires on 34 of the 85 moves where his words name the
// break (40%) and on 3.4% of the other moves — twelve times as often where he
// names it. Every fire elsewhere is a real break; on most of them he talked
// about the plan behind it instead. (The WIP's first cut — a rook already on
// the file, from move 8 — fired on 8%.)
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
/** The first moves are the opening's own pawn moves (the Open Sicilian's d4,
 *  the Queen's Gambit's …c5 — the opening's story and its book moves say
 *  those); a break is named from here. Measured on his moves: from move 6 it
 *  keeps 34 of the 38 breaks he names that it reads at all, and drops 193 of
 *  its 438 fires where he named none. */
const BREAK_FROM_MOVE = 6;
/** How many more squares a bishop must see for the trade to have freed it. */
const FREED_SQUARES = 3;
const CENTRE = new Set(['d4', 'e4', 'd5', 'e5']);

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

/** The squares a pawn of `color` on `sq` attacks. */
function pawnHits(sq: string, color: Color): Square[] {
  const f = sq.charCodeAt(0);
  const r = Number(sq[1]) + (color === 'w' ? 1 : -1);
  if (r < 1 || r > 8) return [];
  return [-1, 1].map((df) => String.fromCharCode(f + df)).filter((x) => x >= 'a' && x <= 'h').map((x) => `${x}${r}` as Square);
}

/** Is the pawn of `color` on `sq` the BASE of a pawn chain: it holds a pawn of
 *  its own, and no pawn of its own holds it? */
function chainBase(board: Chess, sq: string, color: Color): boolean {
  const holds = pawnHits(sq, color).some((s) => { const p = board.get(s); return !!p && p.type === 'p' && p.color === color; });
  if (!holds) return false;
  const held = board.attackers(sq as Square, color).some((s) => board.get(s)?.type === 'p');
  return !held;
}

/** Where the mover's rooks stand. */
function rooksOf(board: Chess, color: Color): string[] {
  const out: string[] = [];
  for (const row of board.board()) for (const cell of row) if (cell && cell.color === color && cell.type === 'r') out.push(cell.square);
  return out;
}

/**
 * The pawn break `san` on `fenBefore`, read for what it is for. `whose` words
 * it from the mover's seat ('your' when the student moved). `lastTo` — the
 * square the opponent's last move landed on (a recapture is no break).
 */
export function pawnBreak(fenBefore: string, san: string, whose: 'your' | 'their', lastTo: string | null): PawnBreak | null {
  if (Number(fenBefore.split(' ')[5] ?? '1') < BREAK_FROM_MOVE) return null;
  if (!isPawnBreak(fenBefore, san, lastTo)) return null;
  const before = new Chess(fenBefore);
  let after: Chess;
  let mv;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  // A check, a promotion or a capture of a piece has its own story (the
  // check, the new queen, the trade): a break is a pawn against a pawn.
  if (!mv || mv.promotion || after.inCheck() || (mv.captured && mv.captured !== 'p')) return null;
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
    if (!take) {
      // No pawn of theirs can take: the break strikes a pawn it attacks.
      const hit = pawnHits(mv.to, me).find((s) => { const p = after.get(s); return !!p && p.type === 'p' && p.color === them; });
      if (!hit) return null;
      traded = after;
      line = [mv.san];
      struck = hit;
    } else {
      traded = new Chess(after.fen());
      traded.move(take.san);
      line = [mv.san, take.san];
      struck = take.from;
    }
  }
  const tradeBoard = line.length === 2 || mv.captured === 'p';
  // WHAT IT STRIKES, on the board as it stood.
  const base = chainBase(before, struck, them);
  const centre = CENTRE.has(struck);
  // WHAT THE TRADE OPENS — against the board with the break pawn still
  // standing (the push's own board; the capture's, the board before it), so
  // a line the push itself opened is not credited to the trade.
  const standing = mv.captured === 'p' ? before : after;
  const opens: Array<{ text: string; squares: string[] }> = [];
  if (tradeBoard) {
    const rooks = rooksOf(traded, me);
    // Toward their king: a file beside a king that has left its home square
    // (castled or walked) — an uncastled king can still choose its side.
    const theirKing = traded.findPiece({ type: 'k', color: them })[0];
    const kingSettled = !!theirKing && theirKing !== (them === 'w' ? 'e1' : 'e8');
    for (const f of [...new Set([mv.from[0], mv.to[0], struck[0]])]) {
      if (pawnsOnFile(standing, f, me) === 0 || pawnsOnFile(traded, f, me) > 0) continue;
      if (rooks.length === 0) continue;
      const onFile = rooks.filter((r) => r[0] === f);
      const open = pawnsOnFile(traded, f, them) === 0;
      const toKing = kingSettled && Math.abs(theirKing.charCodeAt(0) - f.charCodeAt(0)) <= 1;
      // SQUARES NAMED LIKE A HUMAN (David 2026-11-05): the one square a break
      // is about is the pawn it strikes; the rook and the bishop are said in
      // words ("the rook already on that file", "your dark-squared bishop")
      // and their squares go on the board (`squares`).
      const forWhom = onFile.length ? `${whose} rook already on it` : rooks.length === 1 ? `${whose} rook` : `${whose} rooks`;
      opens.push({ text: `${open ? 'opens' : 'half-opens'} the ${f}-file for ${forWhom}${toKing ? `, toward ${whose === 'your' ? 'their' : 'your'} king` : ''}`, squares: onFile });
    }
    for (const row of traded.board()) {
      for (const cell of row) {
        if (!cell || cell.color !== me || cell.type !== 'b') continue;
        if (reach(traded, cell.square, me) - reach(standing, cell.square, me) >= FREED_SQUARES) {
          opens.push({ text: `frees ${whose} ${traded.squareColor(cell.square) === 'dark' ? 'dark' : 'light'}-squared ${NAME.b}`, squares: [cell.square] });
        }
      }
    }
  }
  // The centre names the target; on its own it is no reason (measured: a
  // centre strike that opens nothing fires 83 times where he names no break
  // for 3 where he does).
  if (opens.length === 0 && !base) return null;
  const lead = `${me === 'b' ? '…' : ''}${mv.san}`;
  const theirs = whose === 'your' ? 'their' : 'your';
  const target = `${theirs} pawn on ${struck}${base ? ', the base of the pawn chain' : centre ? ' in the centre' : ''}`;
  // Its verb by what the pawn does: takes it, attacks it, or stands where it
  // can be taken (an offer — d4 against …c5 strikes nothing, c5 strikes it).
  const attacks = pawnHits(mv.to, me).includes(struck as Square);
  const verb = mv.captured === 'p' ? 'takes' : attacks ? 'attacks' : 'offers a trade to';
  const what = andList(opens.map((o) => o.text));
  const text = line.length === 2
    ? `${lead} is a pawn break: it ${verb} ${target}${what ? `, and if ${whose === 'your' ? 'they take' : 'you take'}, it ${what}` : ''}.`
    : `${lead} is a pawn break: it ${verb} ${target}${what ? `, and ${what}` : ''}.`;
  return {
    text: openSentence(text),
    squares: [...new Set([mv.from, mv.to, struck, ...opens.flatMap((o) => o.squares)])],
    proof: legalLineProof(fenBefore, line, whose === 'your' ? 'you' : 'they'),
    key: `pawn-break:${mv.from}${mv.to}`,
  };
}
