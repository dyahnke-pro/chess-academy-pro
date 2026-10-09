/**
 * WHAT CANNOT WAIT ON THIS BOARD (one-board-read build, 2026-10-08).
 *
 * Before any plan, assessment or "what are they doing?" answer, a coach checks
 * three things in this order: can I win something right now, is something of
 * mine about to be taken, and is a pawn about to queen. The plan lane checked
 * only the second; the opponent-move lane checked none, and called …d2 "a
 * quiet move" with the pawn hitting a rook and a bishop and one step from
 * promoting (live replay, 2026-10-08). This is the one read every board
 * answer leads with. It reuses the shared threat computer (`computeMustDefend`,
 * pin-aware, exchange-checked) — no second board scan.
 */
import { Chess, type Square } from 'chess.js';
import { computeMustDefend, flipSideToMove } from './threatOut';
import { takingTheAttackerAnswers } from './positionReadingService';
import { andList } from '../utils/andList';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface BoardUrgency {
  /** The student is the side to move. */
  myMove: boolean;
  /** Their biggest piece the student wins right now (student to move only). */
  win: { square: string; piece: string; value: number } | null;
  /** The student's pieces the opponent wins next move, biggest first. */
  save: Array<{ square: string; piece: string; value: number; attacker: string | null }>;
  /** Their piece attacking the student's biggest stake, when taking it is safe and answers the threat. */
  takeAttacker: { square: string; piece: string } | null;
  /** An opponent pawn that promotes on its next move. */
  promotion: { from: string; to: string } | null;
}

function promotingPawn(fen: string, them: 'w' | 'b'): { from: string; to: string } | null {
  let probe: Chess;
  try {
    const c = new Chess(fen);
    probe = c.turn() === them ? c : new Chess(flipSideToMove(fen) ?? '');
  } catch { return null; }
  const mv = probe.moves({ verbose: true }).find((m) => m.piece === 'p' && !!m.promotion);
  return mv ? { from: mv.from, to: mv.to } : null;
}

export function readBoardUrgency(fen: string, studentColor: 'white' | 'black'): BoardUrgency | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const me: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const myMove = chess.turn() === me;
  // What THEY must defend is what the student wins — real only when it is the
  // student's move (otherwise they simply move it away first).
  const theirs = myMove ? computeMustDefend(fen, them).pieces : [];
  const win = theirs[0] ? { square: theirs[0].square, piece: theirs[0].piece, value: theirs[0].value } : null;
  const save = computeMustDefend(fen, me).pieces.map((p) => ({ square: p.square, piece: p.piece, value: p.value, attacker: p.attackerSquare }));
  // THE ONE CHECK the threat answer and Learn's warning already run: when the
  // attacker can be taken without losing material, taking it IS the answer.
  const att = myMove ? save[0]?.attacker ?? null : null;
  const attPiece = att ? chess.get(att as Square) : null;
  const takeAttacker = att && attPiece && attPiece.color === them && takingTheAttackerAnswers(fen, att as Square, me)
    ? { square: att, piece: attPiece.type }
    : null;
  return { myMove, win, save, promotion: promotingPawn(fen, them), takeAttacker };
}

/** The one sentence that comes before any plan, or null when nothing is urgent.
 *  THE BIGGER STAKE LEADS: taking their queen beats saving your rook, but
 *  saving your queen beats grabbing a knight (a Colle walk: the plan must say
 *  "your queen on g4 can be taken" first, not "take the knight"). */
export function urgencyLead(u: BoardUrgency | null): string | null {
  if (!u) return null;
  const parts: string[] = [];
  const biggestSave = u.save[0]?.value ?? 0;
  const winLeads = !!u.win && u.win.value >= biggestSave;
  if (u.win && winLeads) {
    parts.push(`First, you can take their ${NAME[u.win.piece]} on ${u.win.square} — that wins about ${u.win.value} point${u.win.value === 1 ? '' : 's'} before anything else.`);
  }
  if (u.save.length > 0 && !winLeads) {
    const named = andList(u.save.map((p) => `${NAME[p.piece]} on ${p.square}`));
    if (u.takeAttacker) {
      const hit = u.save.filter((p) => p.attacker === u.takeAttacker?.square).map((p) => `${NAME[p.piece]} on ${p.square}`);
      parts.push(`First, take their ${NAME[u.takeAttacker.piece]} on ${u.takeAttacker.square} — it attacks your ${andList(hit.length ? hit : [named])}.`);
    } else {
      parts.push(`First, your ${named} can be taken — that comes before any plan.`);
    }
  }
  if (u.promotion && !winLeads) {
    parts.push(`Their pawn on ${u.promotion.from} is one step from promoting on ${u.promotion.to}.`);
  }
  return parts.length ? parts.join(' ') : null;
}

/** For "what is their move doing?": the threats their pawn or piece now makes. */
export function threatsAgainst(u: BoardUrgency | null, fromSquare: string, fen: string): string | null {
  if (!u) return null;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const piece = chess.get(fromSquare as Square);
  if (!piece) return null;
  const probeFen = chess.turn() === piece.color ? fen : flipSideToMove(fen);
  if (!probeFen) return null;
  const hits = new Chess(probeFen).moves({ square: fromSquare as Square, verbose: true })
    .filter((m) => m.captured && m.captured !== 'k')
    .map((m) => `${NAME[m.captured as string]} on ${m.to}`);
  const uniq = [...new Set(hits)];
  const promotes = u.promotion?.from === fromSquare;
  if (uniq.length === 0 && !promotes) return null;
  const attack = uniq.length ? `it attacks your ${andList(uniq)}` : '';
  const queen = promotes ? `${attack ? ' and ' : 'it '}threatens to promote` : '';
  return `${attack}${queen}`;
}
