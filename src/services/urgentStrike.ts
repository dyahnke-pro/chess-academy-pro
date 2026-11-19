// urgentStrike — ACT NOW: THE WINDOW CLOSES (Danya have-check, 2026-11-19).
//
// Danya: "White does not have unlimited time — Black threatens ...cxd4 followed
// by ...Ne5 and ...Kh8, buttressing his kingside"; "White must act immediately
// before ...Ke7 consolidates"; "so White must act before Black does". The idea
// is a race against time: the strike that works on THIS move, and the quiet
// move that gives them the one move they need to close the door.
//
// Read off the engine's top lines, chess.js only: the best line's first move is
// ACTIVE (a check, a capture, a pawn into their half, or a move that hits a
// piece of theirs worth a minor or more), it leads the best QUIET alternative
// by a pawn or more, and the side to move is not already winning big (then the
// lesson is converting, not hurrying). The quiet line's reply is the move they
// get to make — named, because that is the door closing.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, PIECE_NAME, isQuiet, lineScore, playLine, sortedLines, seatWords } from './engineLineRead';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface UrgentStrike { side: Color; strike: string; slow: string; reply: string | null; gainCp: number; text: string; squares: Square[] }

/** The least lead the strike has over the slow move. */
export const URGENT_GAP_CP = 50;
/** Beyond this the side to move is converting, not racing. */
const ALREADY_WON_CP = 500;

function hitsNewPiece(fen: string, uci: string): boolean {
  try {
    const c = new Chess(fen);
    const side = c.turn();
    const before = new Set(c.board().flat().filter((p) => p && p.color !== side && p.type !== 'p' && p.type !== 'k' && c.attackers(p.square, side).length > 0).map((p) => p!.square));
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    for (const p of c.board().flat()) {
      if (!p || p.color === side || p.type === 'p' || p.type === 'k' || before.has(p.square)) continue;
      if (c.attackers(p.square, side).includes(m.to) && (MATERIAL_VALUE[p.type] ?? 0) >= 3) return true;
    }
  } catch { return false; }
  return false;
}

/** Why the strike is off the board after the slow move and their reply, or null. */
function windowClosed(after: string | undefined, strike: { from: string; to: string; piece: string; captured?: string; san: string }, replySan: string): string | null {
  if (!after) return null;
  let c: Chess;
  try { c = new Chess(after); } catch { return null; }
  const p = c.get(strike.from as Square);
  const name = PIECE_NAME[strike.piece] ?? 'piece';
  if (!p || p.type !== strike.piece) return `{whose} ${name} on ${strike.from} is gone, and ${strike.san} with it`;
  if (strike.captured) {
    const t = c.get(strike.to as Square);
    if (!t || t.color === p.color) return `the ${PIECE_NAME[strike.captured] ?? 'piece'} has left ${strike.to}, and there is nothing to take`;
  }
  const legal = c.moves({ verbose: true }).some((m) => m.from === strike.from && m.to === strike.to);
  if (legal) return null;
  if (c.inCheck()) return `${replySan} comes with check, and ${strike.san} never happens`;
  const there = c.get(strike.to as Square);
  if (there && there.color !== p.color && !strike.captured) return `they put their own ${PIECE_NAME[there.type] ?? 'piece'} on ${strike.to} first`;
  return `${replySan} shuts ${strike.san} out`;
  return null;
}

/** The strike that has to be played now, or null. `student`: the seat. */
export function urgentStrike(fen: string, lines: readonly EngineLine[], student: Color): UrgentStrike | null {
  let side: Color;
  try { side = new Chess(fen).turn(); } catch { return null; }
  const ls = sortedLines(lines, side);
  if (ls.length < 2) return null;
  const best = lineScore(ls[0], side);
  if (best < -50 || best > ALREADY_WON_CP || ls[0].mate != null) return null;
  const strike = playLine(fen, ls[0].moves, 1).moves[0];
  if (!strike) return null;
  const rank = Number(strike.to[1]);
  const intoTheirHalf = strike.piece === 'p' && (side === 'w' ? rank >= 5 : rank <= 4);
  const active = !isQuiet(strike) || intoTheirHalf || hitsNewPiece(fen, ls[0].moves[0]);
  if (!active) return null;
  // The best QUIET alternative: what happens if the move is spent elsewhere.
  const slowLine = ls.slice(1).find((l) => { const m = playLine(fen, l.moves, 1).moves[0]; return !!m && isQuiet(m) && m.piece !== 'p'; });
  if (!slowLine) return null;
  const slowCp = lineScore(slowLine, side);
  if (best - slowCp < URGENT_GAP_CP || slowLine.mate != null) return null;
  const played = playLine(fen, slowLine.moves, 2).moves;
  const slow = played[0]; const reply = played[1] ?? null;
  if (!reply) return null;
  // THE DOOR CLOSES: after the slow move and their reply, the strike is gone —
  // its piece taken or moved off, or the move no longer legal.
  // Their reply closes it, not the slow move: the strike still stands after
  // the slow move alone.
  if (slow.from === strike.from || slow.to === strike.to) return null;
  const boards = playLine(fen, slowLine.moves, 2).boards;
  const midOpen = (() => { try { const c = new Chess(boards[1]); const f = c.fen().split(' '); f[1] = side; return new Chess(f.join(' ')).moves({ verbose: true }).some((m) => m.from === strike.from && m.to === strike.to); } catch { return false; } })();
  if (!midOpen) return null;
  const closed = windowClosed(boards[2], strike, reply.san);
  if (!closed) return null;
  const w = seatWords(side, student);
  const t = seatWords(side === student ? (side === 'w' ? 'b' : 'w') : side, student);
  const lead = side === student
    ? rotateStem(["There's no time to waste", 'This has to happen now', 'Strike while you can'], stemKeyOf(fen))
    : rotateStem(['They have to act now', 'They have no time to waste'], stemKeyOf(fen));
  const text = `${lead}: ${strike.san} works on this move. Spend it on ${slow.san} and ${t.who} answer ${reply.san} — ${closed.replace('{whose}', w.whose)}.`;
  return { side, strike: strike.san, slow: slow.san, reply: reply.san, gainCp: best - slowCp, text, squares: [strike.from, strike.to, reply.to] };
}
