// compensation — WHO IS BETTER, AND WHAT PAYS FOR IT (WO-OPENINGS-
// REWRITE-01 composer, 2026-11-12: the writers say "a pawn down but slightly
// better", "roughly level despite being a pawn down"). Said only when the
// material and the engine disagree — a side down material and still level or
// better — and only with a reason the board shows: a development lead, a king
// left in the middle, the bishop pair, an advanced passed pawn. No board
// reason, no line: the eval alone is not a why (G0).
//
// PURE: the board, the engine's number and chess.js. Dual use: the same
// assessment a lesson explains is the one a student's gambit is judged by.
import { Chess, type Color } from 'chess.js';
import { developedMinorCount } from './development';
import { quietBalance } from './material';
import { materialBalance } from './pieceValues';
import { evalBand, evalBandWords } from './evalBand';

export interface Assessment {
  /** Whose compensation it is, from the student's seat. */
  who: 'you' | 'they';
  /** Pawns the compensated side is down (1, 2, …). */
  down: number;
  /** The band in words for the compensated side ("level", "slightly better"). */
  band: string;
  reasons: string[];
  squares: string[];
  text: string;
}

const kingOf = (board: Chess, c: Color): string | null => board.board().flat().find((p) => p && p.type === 'k' && p.color === c)?.square ?? null;
const castled = (sq: string | null, c: Color): boolean => !!sq && sq[1] === (c === 'w' ? '1' : '8') && 'gcb'.includes(sq[0]);
const middle = (sq: string | null): boolean => !!sq && 'de'.includes(sq[0]);
const bishops = (board: Chess, c: Color): number => board.board().flat().filter((p) => p && p.type === 'b' && p.color === c).length;
const NUM = ['no', 'one', 'two', 'three', 'four'];

/** The assessment after a move, on `fenAfter`, with the engine's value of it
 *  from the student's seat (cp) and the engine's line from there (UCI, the
 *  side to move first). Null unless one side is down material and still level
 *  or better, with a board reason for it — and null while a trade is still
 *  going: when the line's next move is a capture or a check, the material on
 *  the board is not the material the position settles on (Bxg5 said "two
 *  pawns down" with …Qxg5 Qxg5 to come). No line, no read. */
export function compensation(fenAfter: string, student: Color, studentCp: number, line: readonly string[]): Assessment | null {
  let board: Chess;
  try { board = new Chess(fenAfter); } catch { return null; }
  const first = line[0];
  if (!first) return null;
  try {
    const m = new Chess(fenAfter).move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first.slice(4, 5) || undefined });
    if (m.captured || m.san.includes('+') || m.san.includes('#')) return null;
  } catch { return null; }
  // DOWN IS WHAT THE BOARD AND THE QUIET COUNT AGREE ON (blind grade
  // 2026-11-13): the quiet count takes the capture on offer, so after O-O in
  // the Ruy (…Nxe4 on offer, won straight back) it called a level board "a
  // pawn down", and a pawn on offer counted twice. The smaller of the two,
  // and only when both say the same side is down.
  const quiet = quietBalance(fenAfter); // White-positive, the capture on offer counted
  const raw = materialBalance(fenAfter);
  const bal = Math.sign(quiet) === Math.sign(raw) ? Math.sign(raw) * Math.min(Math.abs(quiet), Math.abs(raw)) : 0;
  const mine = student === 'w' ? bal : -bal;
  let comp: Color | null = null; let down = 0;
  if (mine <= -1 && studentCp >= -50) { comp = student; down = Math.round(-mine); }
  else if (mine >= 1 && studentCp <= 50) { comp = student === 'w' ? 'b' : 'w'; down = Math.round(mine); }
  if (!comp || down < 1) return null;
  const { reasons, squares } = compensationReasons(board, comp, student);
  if (!reasons.length) return null;
  const compCp = comp === student ? studentCp : -studentCp;
  const band = evalBandWords(evalBand(compCp), compCp >= 0 ? 'better' : 'worse');
  const who = comp === student ? 'you' : 'they';
  const pawns = down === 1 ? 'a pawn' : `${NUM[down] ?? down} pawns`;
  const bandWords = band === 'level' ? 'it is about level' : `${who === 'you' ? "you're" : "they're"} ${band}`;
  const why = reasons.length === 1 ? reasons[0] : `${reasons.slice(0, -1).join(', ')} and ${reasons.at(-1)}`;
  const text = `${who === 'you' ? "You're" : "They're"} ${pawns} down, but ${bandWords}: ${why}.`;
  return { who, down, band, reasons, squares, text };
}

/** WHAT PAYS FOR MATERIAL, read off the board (the one list: `compensation`
 *  and `gambitIdea` both say it): a development lead of two pieces, the other
 *  king still in the middle while this side has castled, the bishop pair, an
 *  advanced passed pawn. Worded from the student's seat. */
export function compensationReasons(board: Chess, comp: Color, student: Color, minLead = 2): { reasons: string[]; squares: string[] } {
  const other: Color = comp === 'w' ? 'b' : 'w';
  const reasons: string[] = []; const squares: string[] = [];
  const lead = developedMinorCount(board, comp) - developedMinorCount(board, other);
  if (lead >= minLead) reasons.push(`${comp === student ? "you're" : "they're"} ${lead === 1 ? 'a piece' : `${NUM[lead] ?? lead} pieces`} ahead in development`);
  const ok = kingOf(board, other);
  if (middle(ok) && castled(kingOf(board, comp), comp)) { reasons.push(`${comp === student ? 'their' : 'your'} king is still in the middle`); if (ok) squares.push(ok); }
  if (bishops(board, comp) === 2 && bishops(board, other) < 2) reasons.push(`${comp === student ? 'you have' : 'they have'} the bishop pair`);
  for (const row of board.board()) for (const p of row) {
    if (!p || p.type !== 'p' || p.color !== comp) continue;
    const rank = Number(p.square[1]); const adv = comp === 'w' ? rank >= 5 : rank <= 4;
    if (!adv) continue;
    const passed = !board.board().flat().some((q) => q && q.type === 'p' && q.color === other && Math.abs(q.square.charCodeAt(0) - p.square.charCodeAt(0)) <= 1 && (comp === 'w' ? Number(q.square[1]) > rank : Number(q.square[1]) < rank));
    if (passed) { reasons.push(`${comp === student ? 'your' : 'their'} passed pawn on ${p.square}`); squares.push(p.square); }
  }
  return { reasons, squares };
}
