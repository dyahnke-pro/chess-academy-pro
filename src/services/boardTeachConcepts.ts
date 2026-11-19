// boardTeachConcepts — two teaching concepts read off THIS board for both seats:
// a pin with something to pile on (PP on the PP), and a piece held by one
// guard (remove the guard). Said through the one registry (`boardComputers` →
// `pinPressure`, `guardRemoval`); the live read asks it there.
import { Chess, type Square } from 'chess.js';
import type { ComputerName } from './coachFact';
import { findPinPressure, PIN_PRESSURE_PRINCIPLE, PIN_PRESSURE_WARNING, pieceName, type PinPressure } from './pinPressure';
import { findGuardRemovals, GUARD_REMOVAL_PRINCIPLE, GUARD_REMOVAL_WARNING, type GuardRemoval } from './guardRemoval';
import { stemKeyOf, rotateStem } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';
import { pieceRef } from './pieceRef';

/** A computed concept the live read teaches: its id and source, its words
 *  (`full`, a `short` once its definition was taught, the bare `instance`),
 *  the squares it names, the board it is about and the line that reaches it,
 *  and — for a pile-on — the move that piles on, on the board it is played. */
export interface BoardConcept { id: string; source: string; full: string; short?: string; instance?: string; squares: readonly string[]; boardFen?: string; line?: string[]; pinMove?: { fen: string; san: string }; computer: ComputerName }

/**
 * PP ON THE PP — the pin concept with its principle, read from THIS board for
 * both seats (David 2026-10-05: "state it when it's relevant"). The student
 * holds the pin → the principle, the move and why it works; the opponent holds
 * it → the warning, their move and the student's way out. Null when neither
 * side can pile on and win (a pin alone is not this principle). Pieces are
 * named from their squares; the stem rotates on the board, never at random.
 */
export function pinPressureConcept(fen: string, student: 'w' | 'b'): BoardConcept | null {
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const pick = (holder: 'w' | 'b'): PinPressure | null => findPinPressure(fen, holder)[0] ?? null;
  const name = (sq: string): string => pieceName(board.get(sq as Square)?.type ?? 'p');
  const key = stemKeyOf(fen.split(' ')[0]);
  const mine = pick(student);
  const theirs = mine ? null : pick(them);
  const pp = mine ?? theirs;
  if (!pp) return null;
  const move = pp.moves[0];
  const piece = pieceName(pp.pinnedPiece);
  // Each piece by what it is (`pieceRef`, from the student's seat), the three
  // squares lit, not read out (David 2026-11-05: three squares in a breath).
  const w = (sq: string, fallback: string): string => pieceRef(fen, sq, student)?.words ?? fallback;
  const pinLine = `${openSentence(w(pp.pinner, `${mine ? 'your' : 'their'} ${name(pp.pinner)} on ${pp.pinner}`))} pins ${w(pp.pinned, `${mine ? 'their' : 'your'} ${piece} on ${pp.pinned}`)} to ${w(pp.behind, `${mine ? 'their' : 'your'} ${name(pp.behind)} on ${pp.behind}`)}.`;
  const full = mine
    ? `${pinLine} ${rotateStem(PIN_PRESSURE_PRINCIPLE, key)} ${move.san} adds ${move.byPawn ? 'a pawn' : 'a second attacker'} on the ${piece}, and it can't step away.`
    : (() => {
        const stem = move.byPawn ? PIN_PRESSURE_WARNING[0] : rotateStem(PIN_PRESSURE_WARNING, key);
        const way = stem === PIN_PRESSURE_WARNING[0] ? (move.byPawn ? ' Break the pin before it lands.' : ' Break the pin or add a defender before it lands.') : '';
        return `${pinLine} ${stem} ${move.san} is the pile-on.${way}`;
      })();
  return {
    computer: 'pinPressureConcept',
    id: 'pin', source: 'tactic', full, short: full,
    squares: [pp.pinner, pp.pinned, pp.behind],
    boardFen: fen,
    pinMove: { fen: pp.side === board.turn() ? fen : sideToMoveFlipped(fen), san: move.san },
  };
}

/**
 * REMOVE THE GUARD, from the seat that has it (`findGuardRemovals`, both
 * ways). The student's chance is said WITHOUT the move — Learn names no move
 * unasked (2026-10-10): the target, its one guard, and the method. Their
 * chance names their move, because it is the danger, and the way out.
 */
export function guardRemovalConcept(fen: string, student: 'w' | 'b'): BoardConcept | null {
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const pick = (holder: 'w' | 'b'): GuardRemoval | null => findGuardRemovals(fen, holder)[0] ?? null;
  const key = stemKeyOf(fen.split(' ')[0]);
  const mine = pick(student);
  const theirs = mine ? null : pick(them);
  const gr = mine ?? theirs;
  if (!gr) return null;
  const piece = pieceName(gr.targetPiece);
  const guard = pieceName(gr.guardPiece);
  const move = gr.moves[0];
  const full = mine
    ? `Their ${piece} on ${gr.target} has one guard, the ${guard} on ${gr.guard}. ${rotateStem(GUARD_REMOVAL_PRINCIPLE, key)}`
    // "Bxf3 takes it" was "bishop takes f3 takes it" (David 2026-10-30): the
    // SAN says the capture, and the idea is the guard's removal.
    : `Your ${piece} on ${gr.target} has one guard, the ${guard} on ${gr.guard}, and ${move.san} ${move.kind === 'chase' ? 'chases it off' : 'removes it'}. ${rotateStem(GUARD_REMOVAL_WARNING, key)}`;
  return {
    computer: 'guardRemovalConcept',
    id: 'removal_of_guard', source: 'tactic', full, short: full,
    squares: [gr.target, gr.guard],
    boardFen: fen,
    ...(mine ? {} : { pinMove: { fen: gr.side === board.turn() ? fen : sideToMoveFlipped(fen), san: move.san } }),
  };
}

/** The same board with the other side to move (en passant cleared) — the
 *  position a THREAT is played on: what the mover had set up, as if it were
 *  their turn again. */
function sideToMoveFlipped(fen: string): string {
  const p = fen.split(' ');
  if (p.length < 4) return fen;
  p[1] = p[1] === 'w' ? 'b' : 'w';
  p[3] = '-';
  return p.join(' ');
}

