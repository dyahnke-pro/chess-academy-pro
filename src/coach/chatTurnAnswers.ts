// chatTurnAnswers — the computed answers for the ONE-CHAT kinds that have no
// lane in today's routing (the lesson's board questions asked in chat):
// is a piece loose, how many attack / defend it, why is it a target, what
// about my <piece>. Every sentence is built from chess.js and the app's own
// loose / SEE computers (G0 — no model decides a fact); you / they wording.
//
// The target is what the turn names (a piece or a square), else the piece or
// square the conversation was last about ("and how many defend it?").
import { Chess, type Color, type Square } from 'chess.js';
import type { ConversationState, ResolvedChatTurn } from './chatTurn';
import { findLoosePieces } from '../services/loosePieces';
import { findHangingBySee } from '../services/positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { andList } from '../utils/andList';

const name = (t: string): string => PIECE_NAMES[t] ?? 'piece';

function target(turn: ResolvedChatTurn, memory: ConversationState): Square | null {
  for (const r of turn.referents) {
    if (r.type === 'piece') return r.square as Square;
    if (r.type === 'square') return r.square as Square;
  }
  return (memory.lastPiece?.square ?? memory.lastSquare ?? null) as Square | null;
}

/** "your knight on c6" / "their bishop on b5" from the student's seat. */
function owned(chess: Chess, sq: Square, student: Color): string {
  const p = chess.get(sq);
  if (!p) return `the empty square ${sq}`;
  return `${p.color === student ? 'your' : 'their'} ${name(p.type)} on ${sq}`;
}

function listOf(chess: Chess, squares: readonly Square[]): string {
  return andList(squares.map((s) => `${name(chess.get(s)?.type ?? 'p')} on ${s}`));
}

const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const count = (n: number): string => ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] ?? String(n);

export function answerIsLoose(chess: Chess, sq: Square | null, student: Color, seat: 'me' | 'them' | null = null): string {
  if (sq) {
    const p = chess.get(sq);
    if (!p) return `There is no piece on ${sq}.`;
    const loose = findLoosePieces(chess, p.color).find((l) => l.square === sq);
    if (!loose) return `${capFirst(owned(chess, sq, student))} is guarded.`;
    return loose.attacked
      ? `${capFirst(owned(chess, sq, student))} is loose and attacked by the ${listOf(chess, loose.attackers)}.`
      : `${capFirst(owned(chess, sq, student))} is loose — nothing guards it, though nothing attacks it yet.`;
  }
  // No piece named: the side the turn asked about ("their pieces"), else yours.
  const side: Color = seat === 'them' ? (student === 'w' ? 'b' : 'w') : student;
  const whose = side === student ? 'your' : 'their';
  const list = findLoosePieces(chess, side).filter((l) => l.type !== 'k');
  if (list.length === 0) return `Nothing of ${whose === 'your' ? 'yours' : 'theirs'} is loose.`;
  return `Loose: ${whose} ${andList(list.map((l) => `${name(l.type)} on ${l.square}`))}.`;
}

/** Attackers come from the side that does NOT own the target; defenders from
 *  the side that does. An empty square: the student's side defends it. */
function sides(chess: Chess, sq: Square, student: Color): { owner: Color; enemy: Color } {
  const owner = chess.get(sq)?.color ?? student;
  return { owner, enemy: owner === 'w' ? 'b' : 'w' };
}

export function answerCount(chess: Chess, sq: Square | null, student: Color, which: 'attackers' | 'defenders'): string | null {
  if (!sq) return null;
  const { owner, enemy } = sides(chess, sq, student);
  const by = chess.attackers(sq, which === 'attackers' ? enemy : owner).filter((s) => s !== sq);
  const subject = owned(chess, sq, student);
  const verb = which === 'attackers' ? 'attack' : 'defend';
  if (by.length === 0) return `Nothing ${verb}s ${subject}.`;
  const whose = (which === 'attackers' ? enemy : owner) === student ? 'your' : 'their';
  return `${count(by.length)} ${by.length === 1 ? (which === 'attackers' ? 'attacks' : 'defends') : verb} ${subject}: ${whose} ${listOf(chess, by)}.`;
}

export function answerWhyTarget(chess: Chess, sq: Square | null, student: Color): string | null {
  if (!sq) return null;
  const p = chess.get(sq);
  if (!p) return `There is no piece on ${sq}.`;
  const { owner, enemy } = sides(chess, sq, student);
  const attackers = chess.attackers(sq, enemy);
  const defenders = chess.attackers(sq, owner).filter((s) => s !== sq);
  const subject = capFirst(owned(chess, sq, student));
  if (attackers.length === 0 && defenders.length === 0) return `${subject} is not attacked yet, but nothing guards it — one attack and it is in trouble.`;
  if (attackers.length === 0) return `${subject} is not a target right now: nothing attacks it.`;
  const hanging = findHangingBySee(chess.fen()).some((h) => h.square === sq);
  if (defenders.length === 0) return `${subject} is attacked by the ${listOf(chess, attackers)} and nothing guards it.`;
  if (hanging) return `${subject} is attacked ${attackers.length} time${attackers.length === 1 ? '' : 's'} and defended ${defenders.length} — the trade wins material for the attacker.`;
  return `${subject} is attacked ${attackers.length} time${attackers.length === 1 ? '' : 's'} and defended ${defenders.length} time${defenders.length === 1 ? '' : 's'}, so taking it does not win material yet.`;
}

export function answerAboutPiece(chess: Chess, sq: Square | null, student: Color): string | null {
  if (!sq) return null;
  const p = chess.get(sq);
  if (!p) return `There is no piece on ${sq}.`;
  // Its squares, read with its own side to move (a null move when it is not).
  const parts = chess.fen().split(' ');
  parts[1] = p.color;
  parts[3] = '-';
  let moves = 0;
  try { moves = new Chess(parts.join(' ')).moves({ square: sq, verbose: true }).length; } catch { moves = 0; }
  const safety = answerIsLoose(chess, sq, student);
  const scope = moves === 0 ? 'It has no legal move.' : `It has ${moves} legal move${moves === 1 ? '' : 's'}.`;
  return `${safety} ${scope}`;
}

/** The computed answer for a direct kind; null when the turn names nothing
 *  to answer about (the caller then serves today's route). */
export function directAnswer(turn: ResolvedChatTurn, fen: string, memory: ConversationState, student: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const sq = target(turn, memory);
  switch (turn.kind) {
    case 'is-piece-loose': return answerIsLoose(chess, sq, student, turn.seat);
    case 'count-attackers': return answerCount(chess, sq, student, 'attackers');
    case 'count-defenders': return answerCount(chess, sq, student, 'defenders');
    case 'why-is-it-a-target': return answerWhyTarget(chess, sq, student);
    case 'what-about-piece': return answerAboutPiece(chess, sq, student);
    default: return null;
  }
}
