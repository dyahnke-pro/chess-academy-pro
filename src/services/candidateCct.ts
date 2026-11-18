/**
 * THE BLUNDER CHECK BEFORE A CANDIDATE (WO-DANYA-READS-01 group 10, David
 * 2026-11-18). The habit the coach names after a slip ("run CCT for them") had
 * no computer for the move the student is only CONSIDERING: after it, what
 * checks, what captures that win something and what double attacks would they
 * have? Pure chess.js + the one SEE (`legalSeeGainFor`). G0: every item is a
 * legal move on the board; nothing is guessed.
 */
import { Chess, type Square, type Move } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { andList } from '../utils/andList';
import { flipSideToMove } from './threatOut';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface CandidateCct {
  /** The candidate, as played (SAN). */
  candidateSan: string;
  /** Their checks that do not simply lose the checking piece. */
  checks: string[];
  /** Their captures that win material by the exchange count. */
  wins: Array<{ san: string; piece: string; square: string }>;
  /** Their moves that hit two things of the student's at once. */
  doubles: Array<{ san: string; targets: string[] }>;
}

/** What their move's piece hits next, on the board after it: the student's
 *  pieces it attacks that are loose or worth more than it, and the king. */
function hits(after: string, mv: Move, student: 'w' | 'b'): string[] {
  const probe = new Chess(after);
  const out: string[] = [];
  for (const row of probe.board()) for (const sq of row) {
    if (!sq || sq.color !== student || sq.type === 'k') continue;
    if (!probe.attackers(sq.square, mv.color).includes(mv.to)) continue;
    const free = legalSeeGainFor(after, sq.square, mv.color) > 0;
    if (free || (MATERIAL_VALUE[sq.type] ?? 0) > (MATERIAL_VALUE[mv.piece] ?? 0)) out.push(`${NAME[sq.type]} on ${sq.square}`);
  }
  if (probe.inCheck()) out.unshift('king');
  return out;
}

/** Can the student take the piece on `square` without losing material? */
function takenBack(fen: string, square: Square, student: 'w' | 'b'): boolean {
  let board: Chess;
  try {
    board = new Chess(fen);
    if (board.turn() !== student) {
      const f = flipSideToMove(fen);
      if (!f) return false;
      board = new Chess(f);
    }
  } catch { return false; }
  const takes = board.moves({ verbose: true }).some((m) => m.to === square && !!m.captured);
  return takes && legalSeeGainFor(fen, square, student) >= 0;
}

export function candidateCct(fen: string, candidateSan: string): CandidateCct | null {
  let c: Chess;
  let mine: Move;
  try { c = new Chess(fen); mine = c.move(candidateSan); } catch { return null; }
  const student = mine.color;
  const afterCandidate = c.fen();
  if (c.isGameOver()) return { candidateSan: mine.san, checks: [], wins: [], doubles: [] };
  const checks: string[] = [];
  const wins: CandidateCct['wins'] = [];
  const doubles: CandidateCct['doubles'] = [];
  for (const r of c.moves({ verbose: true })) {
    if (r.captured && r.captured !== 'k' && legalSeeGainFor(afterCandidate, r.to, r.color) > 0) {
      wins.push({ san: r.san, piece: NAME[r.captured], square: r.to });
      continue;
    }
    const b = new Chess(afterCandidate);
    b.move(r.san);
    const after = b.fen();
    // A check that only hands over the checking piece is no threat.
    if (b.inCheck() && legalSeeGainFor(after, r.to, student) <= 0) checks.push(r.san);
    // A double attack counts only when the attacker cannot simply be taken
    // back at no loss (after 4.d3 …d5 hits e4 and c4, and exd5 just takes it).
    const h = hits(after, r, student);
    if (h.length >= 2 && !takenBack(after, r.to, student)) doubles.push({ san: r.san, targets: h });
  }
  return { candidateSan: mine.san, checks, wins, doubles };
}

/** The sentence: what the check found, or that the move passes it. */
export function candidateCctSentence(cct: CandidateCct): string {
  const items: string[] = [];
  for (const w of cct.wins) items.push(`${w.san}, winning your ${w.piece}`);
  for (const d of cct.doubles) items.push(`${d.san}, hitting your ${andList(d.targets.map((t) => (t === 'king' ? 'king' : t)))} at once`);
  if (cct.checks.length) items.push(`${cct.checks.length === 1 ? 'the check' : 'the checks'} ${andList(cct.checks)}`);
  if (items.length === 0) return `Blunder check on ${cct.candidateSan}: after it they have no check, no capture that wins material and no double attack.`;
  return `Blunder check on ${cct.candidateSan}: after it they have ${andList(items)}.`;
}
