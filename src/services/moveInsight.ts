// moveInsight — THE COACH'S INSIGHT (David 2026-10-05: "This app is missing
// insight" … "Do I need to keep pressing? Do I need to defend something? Do I
// need more pieces in the attack?" … "Why was the knight to one square better
// than the other when they both checked the king???").
//
// The app computed facts (check, fork, loose piece) and spoke them as labels.
// Insight is the RELATION between facts, and every piece of it here is read
// off the board (G0 — no model, no guess):
//
//   • positionAsk — what THIS position asks of the student: defend, press,
//     bring one more piece, or improve. The answer move is never named; the
//     idea is (David: "the idea, not the answer").
//   • moveMissed — what the student's own move actually does along the
//     engine's reply: a check the king walks out of, material it gives back.
//   • doubleAttack — the mechanism a move carries: one piece hitting two
//     targets. This is what separates two checks that look alike.
//   • walkableLine — every line spoken comes as arrows plus a Walk button
//     (David: "Button tap to play out any lines the user wants").
//
// One computer, read by every coach surface: Learn drills and hints, the
// puzzle boards, the chat compare, and review (through compareTwoMoves).
import { Chess, type Move, type Square } from 'chess.js';
import type { WalkableLine, WalkPly } from '../types';
import { CAPTURE_VALUE } from './pieceValues';
import { PIECE_NAMES } from '../types/tacticTypes';
import { computeMustDefend } from './threatOut';
import { findHangingBySee } from './positionReadingService';
import { countKingAttack } from './kingSafety';
import { settledNetForLine } from './exchangeLedger';
import { sayMoveClause } from './spokenMove';
import { andList } from '../utils/andList';
import { countWords } from '../utils/countWords';

export type PositionMode = 'defend' | 'press' | 'reinforce' | 'improve';

export interface PositionAsk {
  mode: PositionMode;
  /** One or two sentences, addressed to the side to move. Never names the move. */
  text: string;
  /** Squares the text names, for highlights. */
  squares: string[];
}

export interface DoubleAttack {
  /** The square the moving piece lands on. */
  from: string;
  /** What it hits, biggest first: "the king", "the queen on d8". */
  targets: Array<{ square: string; piece: string; phrase: string }>;
}

const name = (p: string): string => PIECE_NAMES[p] ?? 'piece';
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const num = (n: number): string => NUMBER_WORDS[n] ?? String(n);

function play(fen: string, san: string): { board: Chess; move: Move } | null {
  try {
    const board = new Chess(fen);
    const move = board.move(san);
    return move ? { board, move } : null;
  } catch { return null; }
}

/**
 * ONE PIECE, TWO TARGETS. After `san`, the enemy pieces the moved piece
 * attacks that it can actually win: the king (a check), anything worth more
 * than the attacker, or anything undefended. Null below two targets.
 */
export function doubleAttack(fenBefore: string, san: string): DoubleAttack | null {
  const r = play(fenBefore, san);
  if (!r) return null;
  const { board, move } = r;
  const them = board.turn();
  const mine = move.color;
  const myValue = CAPTURE_VALUE[move.piece] ?? 0;
  const targets: DoubleAttack['targets'] = [];
  for (const row of board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== them) continue;
      let hit = false;
      try { hit = board.attackers(cell.square, mine).includes(move.to); } catch { hit = false; }
      if (!hit) continue;
      const value = CAPTURE_VALUE[cell.type] ?? 0;
      const defended = (() => { try { return board.isAttacked(cell.square, them); } catch { return true; } })();
      if (cell.type === 'k' || value > myValue || !defended) {
        targets.push({ square: cell.square, piece: cell.type, phrase: cell.type === 'k' ? 'the king' : `the ${name(cell.type)} on ${cell.square}` });
      }
    }
  }
  if (targets.length < 2) return null;
  targets.sort((a, b) => (CAPTURE_VALUE[b.piece] ?? 0) - (CAPTURE_VALUE[a.piece] ?? 0));
  return { from: move.to, targets };
}

/** How the best move works, in words that do not name it. */
function directionFor(fen: string, bestSan: string | undefined): string | null {
  if (!bestSan) return null;
  const r = play(fen, bestSan);
  if (!r) return null;
  if (doubleAttack(fen, bestSan)) {
    return r.move.san.includes('+')
      ? 'Look for a check that does more than check — one move that hits two things at once.'
      : 'Look for one move that hits two things at once.';
  }
  if (r.move.san.includes('#')) return 'There is a mate here — start with the checks.';
  if (r.move.san.includes('+')) return 'Start with the checks.';
  if (r.move.captured) return 'Start with the captures.';
  return null;
}

/**
 * WHAT THIS POSITION ASKS of the side to move. `bestSan` (the engine's or the
 * drill's move) only steers the DIRECTION — "start with the checks", "one move
 * that hits two things" — and is never named.
 */
export function positionAsk(fen: string, opts: { bestSan?: string } = {}): PositionAsk {
  let board: Chess;
  try { board = new Chess(fen); } catch { return { mode: 'improve', text: '', squares: [] }; }
  const me = board.turn();
  const them = me === 'w' ? 'b' : 'w';
  const best = opts.bestSan ? play(fen, opts.bestSan) : null;
  const bestForcing = !!best && (best.move.san.includes('+') || best.move.san.includes('#') || !!best.move.captured || !!doubleAttack(fen, opts.bestSan as string));
  const direction = directionFor(fen, opts.bestSan);

  if (board.inCheck()) {
    return { mode: 'defend', text: 'You are in check — the king comes first.', squares: [] };
  }

  const must = computeMustDefend(fen, me).pieces[0];
  if (must) {
    // The cheapest piece of theirs hitting it — the one that takes first.
    const attackerSq = (() => {
      try {
        const sqs = board.attackers(must.square as Square, them);
        return sqs.sort((a, b) => (CAPTURE_VALUE[board.get(a)?.type ?? 'k'] ?? 0) - (CAPTURE_VALUE[board.get(b)?.type ?? 'k'] ?? 0))[0] ?? null;
      } catch { return null; }
    })();
    const attackerPiece = attackerSq ? board.get(attackerSq) : null;
    const by = attackerSq && attackerPiece ? `their ${name(attackerPiece.type)} on ${attackerSq}` : 'they';
    const hit = `${cap(by)} ${by === 'they' ? 'are hitting' : 'is hitting'} your ${name(must.piece)} on ${must.square}`;
    if (bestForcing) {
      return {
        mode: 'press',
        text: `${hit}, but there is something stronger than defending it. ${direction ?? 'Start with the forcing moves — checks, captures, threats.'}`,
        squares: [must.square],
      };
    }
    return { mode: 'defend', text: `${hit} — deal with that first.`, squares: [must.square] };
  }

  const loose = findHangingBySee(fen).filter((h) => h.color === them && h.piece !== 'k').sort((a, b) => b.gain - a.gain)[0];
  const attack = countKingAttack(board, me);
  const attackers = attack?.attackers.size ?? 0;
  const defenders = attack?.defenders.size ?? 0;

  if (bestForcing || loose) {
    const lead = loose
      ? `Their ${name(loose.piece)} on ${loose.square} is not properly protected.`
      : attackers > defenders && attackers >= 2
        ? `You have ${num(attackers)} pieces bearing on their king against ${num(defenders)} defending it.`
        : 'You have the initiative here.';
    return {
      mode: 'press',
      text: `${lead} Keep pressing. ${direction ?? 'Start with the forcing moves — checks, captures, threats.'}`,
      squares: loose ? [loose.square] : [],
    };
  }

  if (attack && attackers >= 1 && attackers <= defenders) {
    return {
      mode: 'reinforce',
      text: `You have ${num(attackers)} ${attackers === 1 ? 'piece' : 'pieces'} near their king and they have ${num(defenders)} defending — bring one more before you strike.`,
      squares: [attack.king],
    };
  }

  return {
    mode: 'improve',
    text: 'Nothing is hanging and no attack is ready — find your worst-placed piece and give it a better job.',
    squares: [],
  };
}

/** SANs of a UCI principal variation from `fen`, stopping at the first illegal move. */
export function pvSans(fen: string, pvUci: readonly string[] | undefined, max = 6): string[] {
  const out: string[] = [];
  if (!pvUci) return out;
  let c: Chess;
  try { c = new Chess(fen); } catch { return out; }
  for (const uci of pvUci.slice(0, max)) {
    try {
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      if (!m) break;
      out.push(m.san);
    } catch { break; }
  }
  return out;
}

/** A spoken line as arrows + a Walk button: one shape for every surface. */
export function walkableLine(startFen: string, sans: readonly string[], label: string): WalkableLine | null {
  let c: Chess;
  try { c = new Chess(startFen); } catch { return null; }
  const plies: WalkPly[] = [];
  for (const san of sans) {
    const fenBefore = c.fen();
    let m: Move | null = null;
    try { m = c.move(san); } catch { m = null; }
    if (!m) break;
    plies.push({ san: m.san, uci: `${m.from}${m.to}${m.promotion ?? ''}`, fenBefore, fenAfter: c.fen() });
  }
  return plies.length > 0 ? { label, startFen, plies } : null;
}

export interface MoveMissed {
  text: string;
  /** The student's move and the engine's answer to it, for arrows + Walk. */
  line: WalkableLine | null;
}

/**
 * WHAT THE STUDENT'S MOVE ACTUALLY DOES, read along the engine's reply line
 * (`replyPv`: UCI, from the board AFTER the move). Null when the line shows
 * nothing worth saying.
 */
export function moveMissed(fenBefore: string, san: string, replyPv: readonly string[] | undefined): MoveMissed | null {
  const r = play(fenBefore, san);
  if (!r) return null;
  const me = r.move.color;
  const replies = pvSans(r.board.fen(), replyPv, 5);
  const line = walkableLine(fenBefore, [r.move.san, ...replies], r.move.san);
  const you = cap(sayMoveClause(r.move.san, fenBefore));
  const reply = replies[0] ? play(r.board.fen(), replies[0]) : null;
  const net = settledNetForLine(fenBefore, [r.move.san, ...replies], me);

  if (net !== null && net <= -1) {
    const lost = countWords(-net);
    return {
      text: reply
        ? `${you}? Then ${sayMoveClause(reply.move.san, r.board.fen())}, and you come out ${lost} down.`
        : `${you} gives away ${lost}.`,
      line,
    };
  }
  if (r.move.san.includes('+') && reply && reply.move.piece === 'k') {
    return { text: `${you} checks, but the king steps to ${reply.move.to} and nothing follows.`, line };
  }
  if (r.move.captured && reply?.move.captured && reply.move.to === r.move.to && (net ?? 0) <= 0) {
    return { text: `${you} takes, but they take back and you have gained nothing.`, line };
  }
  return null;
}

/**
 * THE DIFFERENCE between two moves, in the mechanism that makes it — for the
 * compare answers (chat, review). Empty when there is no mechanism to name;
 * the engine's material verdict still stands on its own then.
 */
export function mechanismContrast(fenBefore: string, betterSan: string, worseSan: string): string | null {
  const better = doubleAttack(fenBefore, betterSan);
  if (!better) return null;
  const worse = doubleAttack(fenBefore, worseSan);
  if (worse) return null;
  const b = play(fenBefore, betterSan);
  const w = play(fenBefore, worseSan);
  if (!b || !w) return null;
  const betterSaid = `${cap(sayMoveClause(b.move.san, fenBefore))} hits ${andList(better.targets.map((t) => t.phrase))} at once`;
  const worseHits = w.move.san.includes('+') ? 'only checks' : 'hits only one thing';
  return `${betterSaid}; ${sayMoveClause(w.move.san, fenBefore)} ${worseHits}.`;
}
