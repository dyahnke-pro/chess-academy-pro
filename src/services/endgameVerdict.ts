// endgameVerdict — THREE VERDICTS ON A QUIET BOARD (Danya have-check, 2026-11-19).
//
// Danya: "There seems no way to make progress (needs patience/maneuvering)";
// "So White has nothing better than to repeat checks — a new resource, the
// king, is needed"; "Defend tenaciously: hunker down and refuse to budge". The
// reads say what a board HAS; none said that a board has nothing to force —
// the verdict that tells a student how to play it.
//
// Read off the engine's top lines, chess.js only (G0):
//   checksRepeat — a top line is checks that bring the same position back
//                  within six moves, while the best line does something else
//                  (the side a pawn or more up).
//   noProgress   — level (within half a pawn) and the best line has no pawn
//                  lever and no capture for six moves: nothing to force.
//   sitTight     — the side to move is worse (one to three and a half pawns),
//                  its best move is no capture, no check and no pawn into
//                  their half, and the best line has the other side take
//                  nothing for six moves: no counterplay, and nothing falls.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, isQuiet, lineScore, playLine, sortedLines } from './engineLineRead';

export type VerdictKind = 'checksRepeat' | 'noProgress' | 'sitTight';
export interface EndgameVerdict { kind: VerdictKind; side: Color; text: string; squares: Square[] }

const posKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

/** A pawn on `sq` (of `color`) that attacks an enemy pawn or is attacked by one: a lever. */
function pawnContact(fen: string, sq: Square, color: Color): boolean {
  let c: Chess;
  try { c = new Chess(fen); } catch { return true; }
  const f = sq.charCodeAt(0); const r = Number(sq[1]);
  const fwd = color === 'w' ? 1 : -1;
  for (const df of [-1, 1]) {
    for (const dr of [fwd, -fwd]) {
      const t = `${String.fromCharCode(f + df)}${r + dr}`;
      if (!/^[a-h][1-8]$/.test(t)) continue;
      const p = c.get(t as Square);
      if (p && p.type === 'p' && p.color !== color) return true;
    }
  }
  return false;
}

export function endgameVerdict(fen: string, lines: readonly EngineLine[], student: Color): EndgameVerdict | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck()) return null;
  const side = c.turn();
  const ls = sortedLines(lines, side);
  if (!ls.length) return null;
  const mine = side === student;
  const best = playLine(fen, ls[0].moves, 6);
  // Checks that go round in circles, while better is on: the best line does
  // something else, a pawn up or better (a perpetual that saves a lost game
  // is the other lesson).
  const top = lineScore(ls[0], side);
  for (const l of ls.slice(1)) {
    if (top < 100) continue;
    const { moves, boards } = playLine(fen, l.moves, 6);
    const start = posKey(fen);
    const back = boards.slice(1).findIndex((b) => posKey(b) === start);
    if (back < 0) continue;
    const loop = moves.slice(0, back + 1);
    if (!loop.filter((m) => m.color === side).every((m) => m.san.includes('+'))) continue;
    if (best.moves[0] && best.moves[0].san === loop[0].san) continue;
    const seq = loop.map((m) => m.san).join(' ');
    const text = mine
      ? `Checking gets you nowhere here: ${seq} is the same position again. You need a new idea, not another check.`
      : `Their checks go round in circles: ${seq} is the same position again. They need a new idea to make progress.`;
    return { kind: 'checksRepeat', side, text, squares: [loop[0].from, loop[0].to] };
  }
  const score = lineScore(ls[0], side);
  if (ls[0].mate != null) return null;
  const firstSix = best.moves.slice(0, 6);
  // A pawn move that touches no enemy pawn is a piece of the maneuvering, not
  // a break: Magnus's ...a5 "does not threaten anything" on a board with "no
  // conceivable way to make progress" (magnus-carlsens-best-endgame-wins#0).
  // An ENDGAME verdict: with queens on, six quiet moves are often an attack
  // being built (Tal's Rh7 board, queen-the-supporting-actress#2, reads level).
  const queensOff = !c.board().flat().some((p) => p?.type === 'q');
  if (queensOff && firstSix.length === 6 && Math.abs(score) <= 50 && firstSix.every((m, i) => !m.captured && (m.piece !== 'p' || !pawnContact(best.boards[i + 1], m.to, m.color)))) {
    const text = mine
      ? 'Nothing here can be forced: there is no pawn break and no target to hit, and the best moves just improve pieces. Maneuver, keep it solid, and wait for them to go wrong.'
      : 'Nothing here can be forced for them: no pawn break, no target. Keep everything solid and they have nothing to hit.';
    return { kind: 'noProgress', side, text, squares: [] };
  }
  if (score <= -100 && score >= -350) {
    const first = best.moves[0];
    const forward = (m: { piece: string; to: string; color: Color }): boolean => m.piece === 'p' && (m.color === 'w' ? Number(m.to[1]) >= 5 : Number(m.to[1]) <= 4);
    if (!first || !isQuiet(first) || forward(first)) return null;
    if (firstSix.length < 6 || firstSix.some((m) => m.color !== side && m.captured)) return null;
    const text = mine
      ? 'You have no counterplay here, so sit tight: keep every piece guarded and wait. Nothing of yours can be taken by force right now.'
      : 'They have no counterplay, so they will sit tight and wait. To win, you need a plan that makes something of theirs fall.';
    return { kind: 'sitTight', side, text, squares: [] };
  }
  return null;
}
