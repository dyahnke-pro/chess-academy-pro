// A MOVE THAT CLEARS A CHECK (Danya, aEKSP 13…Ne4: "moving the knight from f6
// also opens the queen's d8–h4 diagonal, so …Qh4+ comes next"). A piece that
// steps off a line hands the queen, rook or bishop behind it a road to the
// king: the move's second job, and the one the other side has to see.
//
// Computed: the move gives no check itself; after it, a queen, rook or bishop
// of the mover has a check whose path runs through the square the moved piece
// left (so the move is what opened it), the checking square is not lost to
// the legal exchange, and that check is played in the line that follows,
// on the mover's second move after (the next move's check is the deep fact's) — a road opened and then used, never a
// check that merely could be given. Pure (chess.js). Both seats.
import { Chess, type Color } from 'chess.js';
import { legalSeeGainFor, asIfToMove } from './positionReadingService';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME: Record<string, string> = { b: 'bishop', r: 'rook', q: 'queen' };

export interface OpenedCheck {
  /** The checking piece's name ("queen"), its square and the check square. */
  piece: string;
  from: string;
  to: string;
  /** The check as played, with its dots ("…Qh4+"). */
  check: string;
  /** Always 2: the check comes a move later (the next move's is the deep fact's). */
  movesLater: 2;
  /** The clause after a move intro, in the tense asked. */
  clause: string;
  squares: string[];
}

function between(a: string, b: string, x: string): boolean {
  const af = a.charCodeAt(0), ar = Number(a[1]), bf = b.charCodeAt(0), br = Number(b[1]), xf = x.charCodeAt(0), xr = Number(x[1]);
  if (!(af === bf || ar === br || Math.abs(bf - af) === Math.abs(br - ar))) return false;
  const df = Math.sign(bf - af), dr = Math.sign(br - ar);
  for (let f = af + df, r = ar + dr; f !== bf || r !== br; f += df, r += dr) if (f === xf && r === xr) return true;
  return false;
}

function roadOf(a: string, b: string): string {
  if (a[0] === b[0]) return 'file';
  if (a[1] === b[1]) return 'rank';
  return 'diagonal';
}

/** `line`: the moves played after `san` (the reply first). `tense`: 'past'
 *  for a move already played (Review), 'now' for a line being shown. */
export function opensCheck(fenBefore: string, san: string, line: readonly string[] | null, mine: boolean, tense: 'past' | 'now'): OpenedCheck | null {
  if (!line || line.length < 2) return null;
  let after: Chess;
  let vacated: string;
  let mover: Color;
  try {
    after = new Chess(fenBefore);
    mover = after.turn();
    const mv = after.move(san);
    if (after.inCheck()) return null;
    vacated = mv.from;
  } catch { return null; }
  const asIf = asIfToMove(after.fen(), mover);
  if (!asIf) return null;
  const opp: Color = mover === 'w' ? 'b' : 'w';
  // The checks the move opened: a line piece's check through the vacated square.
  const opened: Array<{ from: string; to: string; type: string }> = [];
  const probe = new Chess(asIf);
  for (const m of probe.moves({ verbose: true })) {
    if (!'bqr'.includes(m.piece) || !m.san.includes('+')) continue;
    if (!between(m.from, m.to, vacated)) continue;
    const c = new Chess(asIf);
    c.move(m.san);
    if (legalSeeGainFor(c.fen(), m.to, opp) > 0) continue;
    opened.push({ from: m.from, to: m.to, type: m.piece });
  }
  if (opened.length === 0) return null;
  // …AND USED: the same check, from the same square, within the mover's next two moves.
  let board: Chess;
  try { board = new Chess(after.fen()); } catch { return null; }
  for (let k = 0; k < Math.min(line.length, 4); k++) {
    let m;
    try { m = board.move(line[k]); } catch { return null; }
    if (k % 2 === 0) continue;
    const hit = opened.find((o) => o.from === m.from && o.to === m.to);
    if (!hit) continue;
    if (!m.san.includes('+')) return null;
    // THE CHECK ON THE VERY NEXT MOVE is the deep fact's ("it opens the way
    // for your queen to a5, where it gives check" — `threeFacts.deepFact`
    // reads the line's next move); this computer says the road opened for a
    // check that comes a move later, which no other computer reads.
    if (k === 1) return null;
    const check = mover === 'b' ? `…${m.san}` : m.san;
    const movesLater = 2 as const;
    const own = mine ? 'your' : 'their';
    const piece = NAME[hit.type];
    const road = roadOf(hit.from, hit.to);
    const key = stemKeyOf(`${fenBefore}|${m.san}`);
    const when = tense === 'past' ? 'came a move later' : 'comes a move later';
    const clause = rotateStem([
      `${tense === 'past' ? 'opened' : 'opens'} ${own} ${piece}'s ${road} to ${hit.to}, and ${check} ${when}`,
      `${tense === 'past' ? 'cleared' : 'clears'} the way for ${own} ${piece} to check on ${hit.to}, and ${check} ${when}`,
    ], key);
    return { piece, from: hit.from, to: hit.to, check, movesLater, clause, squares: [vacated, hit.from, hit.to] };
  }
  return null;
}
