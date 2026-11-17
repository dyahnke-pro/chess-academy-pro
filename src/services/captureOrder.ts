// TWO THINGS TO TAKE: THE ONE WITH CHECK FIRST (Danya, J4WzT 21.Nxb8+: "order
// of operations — first take the rook with check, then collect the other
// one"). When two pieces hang, the capture that gives check leaves them no
// time to save the other; the other capture first gives them a move.
//
// Computed: the move is a capture that gives check and wins material; the
// mover's next move in the line is a second capture, on another square, that
// was already winning material on the board before the move and still wins
// it when it is played; and the engine's own reads of the board before say
// the order matters — the line starting with the second capture is at least a
// pawn worse for the mover than the line starting with the check. Why it is
// worse is read off that line: their answer to the other capture first.
// Pure (chess.js and the legal exchange read); the reads are handed in.
// Both seats.
import { Chess, type Color } from 'chess.js';
import { captureNet } from './material';
import { seatCp } from './winChance';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A read of the board before the move (White's view, the shape `AnalysisLine` has). */
export interface OrderRead { evaluation: number; mate?: number | null; moves: readonly string[] }

/** The other capture first must cost at least this much (cp, the mover's view). */
const ORDER_CP = 100;
/** Each capture wins at least this much on its own board (pawns): the exchange or more, never a pawn. */
const WINS = 2;

export interface CaptureOrder {
  first: { san: string; square: string; piece: string };
  second: { san: string; square: string; piece: string };
  /** What their answer to the other capture first does ("their king takes your
   *  knight on c6"), or null when the line shows only the cost. */
  because: string | null;
  text: string;
  squares: string[];
}

const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;

export function captureOrder(
  fenBefore: string,
  san: string,
  line: readonly string[] | null,
  reads: readonly OrderRead[],
  mine: boolean,
  tense: 'past' | 'now',
): CaptureOrder | null {
  if (!line || line.length < 2 || reads.length < 2) return null;
  let mover: Color;
  let x; let y;
  try {
    const b = new Chess(fenBefore);
    mover = b.turn();
    x = b.move(san);
    if (!x.captured || !b.inCheck()) return null;
    b.move(line[0]);
    const yBoard = b.fen();
    y = b.move(line[1]);
    if (!y.captured || y.to === x.to) return null;
    if ((captureNet(yBoard, y.san) ?? 0) < WINS) return null;
  } catch { return null; }
  if ((captureNet(fenBefore, san) ?? 0) < WINS) return null;
  // The second capture was there before the move, and winning then too.
  let yNow;
  try { yNow = new Chess(fenBefore).move({ from: y.from, to: y.to, promotion: y.promotion }); } catch { return null; }
  if ((captureNet(fenBefore, yNow.san) ?? 0) < WINS) return null;
  // THE READS SAY THE ORDER MATTERS.
  const xRead = reads.find((r) => r.moves[0] === uciOf(x));
  const yRead = reads.find((r) => r.moves[0] === uciOf(yNow));
  if (!xRead || !yRead) return null;
  if (seatCp(xRead, mover) - seatCp(yRead, mover) < ORDER_CP) return null;
  // Why: their answer to the other capture first, on the engine's line.
  const own = mine ? 'your' : 'their', theirs = mine ? 'their' : 'your';
  const past = tense === 'past';
  let because: string | null = null;
  try {
    const c = new Chess(fenBefore);
    c.move(yNow.san);
    const u = yRead.moves[1];
    const r = u ? c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) : null;
    const lets = past ? 'would have let' : 'lets';
    if (r?.captured && r.to === x.from) because = `${lets} ${theirs} ${NAME[r.piece]} take ${own} ${NAME[x.piece]} on ${x.from}`;
    else if (r && r.from === x.to) because = `${lets} the ${NAME[x.captured ?? 'p']} on ${x.to} get away`;
  } catch { because = null; }
  const p1 = NAME[x.captured ?? 'p'], p2 = NAME[y.captured ?? 'p'];
  const key = stemKeyOf(`${fenBefore}|${san}`);
  const why = because ? ` Taking on ${y.to} first ${because}.` : '';
  // THE FIRST CAPTURE IS NAMED BY ITS MOVE: its square holds the capturer
  // now, so "the rook on b8" would be false on the board it is said on.
  const X = mover === 'b' ? `…${x.san}` : x.san;
  const text = mine
    ? rotateStem(past
      ? [`Two of ${theirs} pieces were hanging, so the order mattered: ${X} came first, with check, and the ${p2} on ${y.to} was still there after.${why}`,
        `With two pieces to take, the one with check comes first: ${X}, and the ${p2} on ${y.to} could not get away.${why}`]
      : [`Two of ${theirs} pieces hang, so the order matters: ${X} comes first, with check, and the ${p2} on ${y.to} is still there after.${why}`,
        `With two pieces to take, the one with check comes first: ${X}, and the ${p2} on ${y.to} can't get away.${why}`], key)
    : rotateStem(past
      ? [`They had two of ${own} pieces to take and got the order right: ${X} first, with check, so ${own} ${p2} on ${y.to} had no time to get away.${why}`,
        `With two of ${own} pieces to take, they took with check first: ${X}, and ${own} ${p2} on ${y.to} was still there after.${why}`]
      : [`They have two of ${own} pieces to take and get the order right: ${X} first, with check, so ${own} ${p2} on ${y.to} has no time to get away.${why}`,
        `With two of ${own} pieces to take, they take with check first: ${X}, and ${own} ${p2} on ${y.to} is still there after.${why}`], key);
  return {
    first: { san: x.san, square: x.to, piece: p1 },
    second: { san: y.san, square: y.to, piece: p2 },
    because,
    text,
    squares: [...new Set([x.from, x.to, y.from, y.to])],
  };
}
