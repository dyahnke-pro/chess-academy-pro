// prophylaxis — STOP IT BEFORE IT LANDS (teaching census rank 2: "a modest h3
// takes g4 away from the bishop before the pin can happen; a4 stops b5 from
// arriving with tempo"). Was MISSING as a computer — only a theme tag.
//
// Read on the student's turn: what the opponent WANTS next (their move if
// they had it now — a pin of your knight or bishop against the queen or king,
// or a pawn kick on a minor), and the QUIET move of yours (a one-step pawn
// move or a king step) after which that move no longer works: the square is
// taken from them (a pawn now covers it and taking back wins material for
// you), or the pin no longer pins anything.
//
// DUAL-USE: Learn names it as advice on the student's turn (gated by the move-
// advice rule and the engine's own top lines); a review can name the quiet
// move the student skipped when the pin or kick then arrived.
// The proof is exact: the covering pawn and its capture, read off the board.
// PURE: chess.js + the legal SEE.
import { openSentence } from '../utils/openSentence';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import type { Proof } from './proof';
import { CAPTURE_VALUE } from './pieceValues';
import { PIECE_NAMES } from '../types/tacticTypes';

export type ProphylaxisKind = 'pin' | 'kick' | 'fork';

export interface Prophylaxis {
  kind: ProphylaxisKind;
  /** Their wanted move, on the board where they would play it now. */
  intent: { san: string; from: Square; to: Square; piece: PieceSymbol };
  /** The student's piece it would pin or kick. */
  victim: { square: Square; piece: PieceSymbol };
  /** The quiet move that stops it. */
  prevention: { san: string; from: Square; to: Square; piece: PieceSymbol };
  squares: Square[];
}

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;
const VAL = CAPTURE_VALUE as Readonly<Record<PieceSymbol, number>>;

function withTurn(fen: string, turn: Color): Chess | null {
  const p = fen.split(' ');
  p[1] = turn; p[3] = '-';
  try { const c = new Chess(p.join(' ')); return c; } catch { return null; }
}

/** The student piece their move `m` pins against the queen or king (a minor
 *  with the big piece straight behind it on the line from m.to), or null. */
function pinVictim(after: Chess, m: Move, me: Color): { square: Square; piece: PieceSymbol } | null {
  if (m.piece !== 'b' && m.piece !== 'r' && m.piece !== 'q') return null;
  const dirs = m.piece === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : m.piece === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
    : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const f0 = m.to.charCodeAt(0) - 97;
  const r0 = Number(m.to[1]) - 1;
  for (const [df, dr] of dirs) {
    let first: { square: Square; piece: PieceSymbol } | null = null;
    for (let f = f0 + df, r = r0 + dr; f >= 0 && f < 8 && r >= 0 && r < 8; f += df, r += dr) {
      const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
      const pc = after.get(sq);
      if (!pc) continue;
      if (pc.color !== me) break;
      if (!first) {
        if (pc.type !== 'n' && pc.type !== 'b') break;
        first = { square: sq, piece: pc.type };
        continue;
      }
      if (pc.type === 'q' || pc.type === 'k') return first;
      break;
    }
  }
  return null;
}

/** Their moves that would pin or kick one of the student's minors right now. */
function intents(fen: string, me: Color): { m: Move; kind: ProphylaxisKind; victim: { square: Square; piece: PieceSymbol } }[] {
  const them: Color = me === 'w' ? 'b' : 'w';
  const board = withTurn(fen, them);
  if (!board || board.inCheck()) return [];
  const out: { m: Move; kind: ProphylaxisKind; victim: { square: Square; piece: PieceSymbol } }[] = [];
  for (const m of board.moves({ verbose: true })) {
    if (m.captured || m.san.includes('+')) continue;
    board.move(m);
    const after = board;
    // The move must be safe for them where it lands — a pin or kick that just
    // loses the piece is no plan of theirs.
    if (legalSeeGainFor(after.fen(), m.to, me) > 0) { board.undo(); continue; }
    if (m.piece === 'p') {
      // A pawn kick: the pawn lands hitting a student minor (or bigger), safely.
      const f = m.to.charCodeAt(0) - 97;
      const r = Number(m.to[1]) - 1 + (them === 'w' ? 1 : -1);
      for (const df of [-1, 1]) {
        if (f + df < 0 || f + df > 7 || r < 0 || r > 7) continue;
        const sq = `${String.fromCharCode(97 + f + df)}${r + 1}` as Square;
        const pc = after.get(sq);
        if (pc && pc.color === me && VAL[pc.type] >= 3 && pc.type !== 'k') {
          out.push({ m, kind: 'kick', victim: { square: sq, piece: pc.type } });
          break;
        }
      }
    } else {
      const v = pinVictim(after, m, me);
      if (v) out.push({ m, kind: 'pin', victim: v });
      else {
        // A FORK: the piece lands hitting two of the student's pieces each
        // worth more than it (or the king and one more).
        const hit: { square: Square; piece: PieceSymbol }[] = [];
        for (const row of after.board()) for (const cell of row) {
          if (!cell || cell.color !== me) continue;
          if (!after.attackers(cell.square, them).includes(m.to)) continue;
          if (cell.type === 'k' || VAL[cell.type] > VAL[m.piece]) hit.push({ square: cell.square, piece: cell.type });
        }
        if (hit.length >= 2) {
          const victim = hit.filter((h) => h.piece !== 'k').sort((a, b) => VAL[b.piece] - VAL[a.piece])[0];
          if (victim) out.push({ m, kind: 'fork', victim });
        }
      }
    }
    board.undo();
  }
  return out;
}

/** Does `intent` still work after the student's quiet move? It fails when the
 *  move is no longer legal for them, or its landing square can be taken with
 *  profit, or (a pin) it no longer pins anything. */
function stillWorks(fenAfterPrevention: string, me: Color, i: { m: Move; kind: ProphylaxisKind }): boolean {
  const them: Color = me === 'w' ? 'b' : 'w';
  const board = withTurn(fenAfterPrevention, them);
  if (!board) return false;
  const again = board.moves({ verbose: true }).find((x) => x.from === i.m.from && x.to === i.m.to);
  if (!again) return false;
  board.move(again);
  if (legalSeeGainFor(board.fen(), again.to, me) > 0) return false;
  if (i.kind === 'pin') return !!pinVictim(board, again, me);
  return true;   // a fork or kick that still lands safely still works
}

/**
 * The prophylactic move on `fen` (the student to move), or null. Prefers the
 * PIN (it costs more if it lands); a pawn prevention before a king step.
 */
export function findProphylaxis(fen: string): Prophylaxis | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.inCheck()) return null;
  const me = board.turn();
  const ORDER: Record<ProphylaxisKind, number> = { fork: 0, pin: 1, kick: 2 };
  const wants = intents(fen, me).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  if (wants.length === 0) return null;
  const quiet = board.moves({ verbose: true }).filter((m) => !m.captured && !m.san.includes('+')
    && ((m.piece === 'p' && Math.abs(Number(m.to[1]) - Number(m.from[1])) === 1) || (m.piece === 'k' && !m.san.startsWith('O'))))
    .sort((a, b) => (a.piece === b.piece ? 0 : a.piece === 'p' ? -1 : 1));
  for (const w of wants) {
    for (const q of quiet) {
      board.move(q);
      const after = board.fen();
      board.undo();
      // The quiet move must not hand them something worse: it is safe itself.
      if (legalSeeGainFor(after, q.to, me === 'w' ? 'b' : 'w') > 0) continue;
      if (stillWorks(after, me, w)) continue;
      return {
        kind: w.kind,
        intent: { san: w.m.san, from: w.m.from, to: w.m.to, piece: w.m.piece },
        victim: w.victim,
        prevention: { san: q.san, from: q.from, to: q.to, piece: q.piece },
        squares: [w.m.to, w.victim.square, q.to],
      };
    }
  }
  return null;
}

/** The proof: what their move would do, and why it no longer works. Exact. */
export function prophylaxisProof(p: Prophylaxis): Proof {
  const covers = p.prevention.piece === 'p'
    ? `after ${p.prevention.san} the pawn covers ${p.intent.to}`
    : `after ${p.prevention.san} it no longer works`;
  return {
    kind: 'squares', exact: true,
    short: covers,
    full: `${p.intent.san} would ${p.kind === 'pin' ? 'pin' : p.kind === 'fork' ? 'fork' : 'hit'} your ${NAME[p.victim.piece]} on ${p.victim.square}, and ${covers}`,
    squares: p.squares,
  };
}

/** The advice, with its proof. */
export function prophylaxisLine(p: Prophylaxis): string {
  const what = `the ${p.kind} with ${p.intent.san}`;
  return `${p.prevention.san} first — it stops ${what} before it lands. ${(() => { const f = prophylaxisProof(p).full; return `${openSentence(f)}.`; })()}`;
}
