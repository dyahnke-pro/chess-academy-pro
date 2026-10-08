// methodSignals — the board facts that EARN three more method habits
// (computers batch 2; methodBeat.ts holds the stems, this holds the proof).
//
// A method beat is the procedure the student should run, never a new fact —
// but every one is earned by a fact computed here first, so it can never
// become generic advice (empty > generic):
//
//   look-again     — a piece of yours is attacked, and the plain defence the
//                    engine looked at runs into something: its line costs at
//                    least a pawn and a half against the engine's best.
//   calc-now       — the engine's line opens with three forcing plies in a
//                    row: a position to calculate, on your own turn.
//   mark-line      — the engine's move is a sacrifice; the line it leads into
//                    is FORCED (every reply of theirs is the only move, or a
//                    check with at most two answers) or SPECULATIVE.
//
// Pure: chess.js + the engine lines the surface already holds.
import { Chess } from 'chess.js';
import { computeMustDefend } from './threatOut';
import { isSacrifice } from './factStakes';
import { legalLineProof, type Proof } from './proof';
import type { EngineLine } from './opponentMoveReads';
import { seatCp, uciToSan } from './opponentMoveReads';

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface NaturalDefence { target: string; defence: string; proof: Proof }

/**
 * The plain defence of your attacked piece that the engine rates far below its
 * best — "the queen defends, but look again". Student to move. Null when no
 * piece is attacked, or every defence the engine considered holds.
 */
export function naturalDefenceFails(fen: string, student: 'w' | 'b', topLines: readonly EngineLine[]): NaturalDefence | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== student || board.inCheck() || topLines.length < 2) return null;
  const hit = computeMustDefend(fen, student).pieces.at(0);
  if (!hit) return null;
  const best = seatCp(topLines[0], student);
  for (const l of topLines.slice(1)) {
    if (best - seatCp(l, student) < 150) continue;
    const san = uciToSan(fen, l.moves[0]);
    if (!san) continue;
    const after = new Chess(fen); const mv = after.move(san);
    if (mv.from === hit.square || mv.captured) continue; // a defence, not a flight or a trade
    if (computeMustDefend(after.fen(), student).pieces.some((p) => p.square === hit.square)) continue;
    const proof = legalLineProof(fen, l.moves.slice(0, 4));
    if (!proof) continue;
    return { target: `your ${PIECE[hit.piece.toLowerCase()] ?? 'piece'} on ${hit.square}`, defence: san, proof };
  }
  return null;
}

/** Are the first three plies of the engine's line all checks or captures? */
export function forcingLine(fen: string, top: EngineLine | undefined): Proof | null {
  if (!top || top.moves.length < 3) return null;
  const sans: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of top.moves.slice(0, 3)) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m.captured && !/[+#]/.test(m.san)) return null;
      sans.push(m.san);
    }
  } catch { return null; }
  return legalLineProof(fen, sans);
}

export interface LineMark { mark: 'forced' | 'speculative'; proof: Proof }

/**
 * When the engine's move is a sacrifice: is the line that follows forced?
 * Every reply of theirs along the first six plies must be the only legal move,
 * or an answer to check with at most two legal moves. Otherwise speculative.
 */
export function markSacrificeLine(fen: string, top: EngineLine | undefined): LineMark | null {
  if (!top || top.moves.length < 2) return null;
  const bestSan = uciToSan(fen, top.moves[0]);
  if (!bestSan) return null;
  let replySan: string | null = null;
  try { const c = new Chess(fen); c.move(bestSan); replySan = uciToSan(c.fen(), top.moves[1]); } catch { return null; }
  if (!isSacrifice(fen, bestSan, replySan)) return null;
  let forced = true;
  const sans: string[] = [];
  try {
    const c = new Chess(fen);
    const me = c.turn();
    for (const u of top.moves.slice(0, 6)) {
      if (c.turn() !== me) {
        const n = c.moves().length;
        if (!(n === 1 || (c.inCheck() && n <= 2))) forced = false;
      }
      sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    }
  } catch { /* the line stops where it stops being legal */ }
  if (sans.length < 2) return null;
  const proof = legalLineProof(fen, sans);
  return proof ? { mark: forced ? 'forced' : 'speculative', proof } : null;
}
