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
// by half a pawn or more, and the side to move is not already winning big (then the
// lesson is converting, not hurrying). The quiet line's reply is the move they
// get to make — named, because that is the door closing: it takes the striking
// piece, blocks its road, or comes with check. A target that only steps away
// is a piece saved, never this read.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, PIECE_NAME, isQuiet, lineScore, playLine, sortedLines, seatWords } from './engineLineRead';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { sideToMoveAs } from './threatOut';

export interface UrgentStrike { side: Color; strike: string; slow: string; reply: string | null; gainCp: number; text: string; squares: Square[] }

/** The least lead the strike has over the slow move. */
export const URGENT_GAP_CP = 50;
/** Beyond this the side to move is converting, not racing. */
const ALREADY_WON_CP = 500;

function hitsNewPiece(fen: string, uci: string): boolean {
  try {
    const c = new Chess(fen);
    const side = c.turn();
    const before = new Set(c.board().flat().filter((p) => p && p.color !== side && p.type !== 'p' && p.type !== 'k' && c.attackers(p.square, side).length > 0).map((p) => p?.square));
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    for (const p of c.board().flat()) {
      if (!p || p.color === side || p.type === 'p' || p.type === 'k' || before.has(p.square)) continue;
      if (c.attackers(p.square, side).includes(m.to) && (MATERIAL_VALUE[p.type] ?? 0) >= 3) return true;
    }
  } catch { return false; }
  return false;
}

/** A gap this wide is the moment gone, whether or not the strike stays legal. */
const DOOR_SHUT_CP = 100;

/** A piece (not a pawn) that lands in their half hitting a square beside
 *  their king: a strike at the king, though it takes nothing. */
function strikesAtKing(fen: string, uci: string): boolean {
  try {
    const c = new Chess(fen);
    const side = c.turn();
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (m.piece === 'p' || m.piece === 'k') return false;
    const rank = Number(m.to[1]);
    if (side === 'w' ? rank < 5 : rank > 4) return false;
    const king = c.findPiece({ type: 'k', color: side === 'w' ? 'b' : 'w' })[0];
    if (!king) return false;
    const f = king.charCodeAt(0); const r = Number(king[1]);
    for (const df of [-1, 0, 1]) for (const dr of [-1, 0, 1]) {
      const sq = `${String.fromCharCode(f + df)}${r + dr}`;
      if (!/^[a-h][1-8]$/.test(sq) || sq === king) continue;
      if (c.attackers(sq as Square, side).includes(m.to)) return true;
    }
  } catch { return false; }
  return false;
}

/** Why the strike is off the board after the slow move and their reply, or null. */
function windowClosed(after: string | undefined, strike: { from: string; to: string; piece: string; color: Color; captured?: string; san: string }, replySan: string): string | null {
  if (!after) return null;
  let c: Chess;
  try { c = new Chess(after); } catch { return null; }
  const p = c.get(strike.from as Square);
  const name = PIECE_NAME[strike.piece] ?? 'piece';
  if (!p || p.type !== strike.piece || p.color !== strike.color) return `{whose} ${name} on ${strike.from} is gone, and ${strike.san} with it`;
  if (strike.captured) {
    const t = c.get(strike.to as Square);
    // The target simply stepping away is a piece saved, not a door closing
    // ("take it before it runs" is the loose-piece read's lesson).
    if (!t || t.color === p.color) return null;
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
  const active = !isQuiet(strike) || intoTheirHalf || hitsNewPiece(fen, ls[0].moves[0]) || strikesAtKing(fen, ls[0].moves[0]);
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
  // Their reply taking with the very piece the strike takes is the same trade
  // the other way round — a recapture to make, not a window closing.
  if (reply.from === strike.to) return null;
  const boards = playLine(fen, slowLine.moves, 2).boards;
  const midOpen = (() => { const asMe = sideToMoveAs(boards[1], side); if (!asMe) return false; try { return new Chess(asMe).moves({ verbose: true }).some((m) => m.from === strike.from && m.to === strike.to); } catch { return false; } })();
  if (!midOpen) return null;
  // The strike can still be legal after their reply and the moment gone all
  // the same: Tal's Rh7 (queen-the-supporting-actress#2), "Black needs only one
  // more move (...Ke7 or ...Nd3+) to consolidate". The engine's own lines
  // measure that — the slow move a pawn or more worse is the door closing.
  // A quiet strike only: a check or a capture that wins by a pawn is the
  // forcing-move read's, said already.
  const lost = best - slowCp;
  const shut = windowClosed(boards[2], strike, reply.san);
  const gone = !shut && isQuiet(strike) && lost >= DOOR_SHUT_CP;
  if (!shut && !gone) return null;
  const w = seatWords(side, student);
  // The reply is the other side's, whoever strikes.
  const t = seatWords(side === 'w' ? 'b' : 'w', student);
  const lead = side === student
    ? rotateStem(["There's no time to waste", 'This has to happen now', 'Strike while you can'], stemKeyOf(fen))
    : rotateStem(['They have to act now', 'They have no time to waste'], stemKeyOf(fen));
  const text = shut
    ? `${lead}: ${strike.san} works on this move. Spend it on ${slow.san} and ${t.who} answer ${reply.san} — ${shut.replace('{whose}', w.whose)}.`
    : `${lead}: ${strike.san} works on this move. Spend it on ${slow.san} and ${t.who} get the move ${t.who} need, ${reply.san}: the engine has that ${(lost / 100).toFixed(1)} pawns worse for ${w.who}.`;
  return { side, strike: strike.san, slow: slow.san, reply: reply.san, gainCp: best - slowCp, text, squares: [strike.from, strike.to, reply.to] };
}
