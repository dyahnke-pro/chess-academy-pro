// thinkingAnswerDangerStep — step 4, "Answer the danger".
//
// Once "am I safe?" finds a piece in danger, the next habit is to answer it:
// move it, guard it, block, or counter with something bigger. The first
// question of the step is the most common answer — MOVE IT — and asks the
// student to find every square where that piece is safe.
//
// Used only on boards where exactly ONE of the student's pieces is in danger
// (the "am I safe?" key, so the two steps speak one vocabulary). A square is
// safe when the piece can go there legally and nothing of theirs attacks it,
// or it is guarded and every attacker is worth at least as much (SEE-free
// rule of thumb, stated in the reason).
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import type { FairKey } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { safetyKey } from './thinkingSafetyStep';
import { rotateStem } from '../utils/rotateStem';

export const ANSWER_DANGER_STEP_TAGS: readonly MisconceptionTagId[] = ['hung-material', 'missed-opponents-threat'];

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';

/** The one piece in danger, or null when there is not exactly one. */
export function pieceInDanger(fen: string): Square | null {
  const k = safetyKey(fen);
  return k && k.key.length === 1 ? k.key[0] : null;
}

function safeAfterMove(fen: string, from: Square, to: Square): boolean {
  const c = new Chess(fen);
  const mover = c.get(from);
  if (!mover) return false;
  const m = c.move({ from, to, promotion: 'q' });
  if (!m) return false;
  const them = mover.color === 'w' ? 'b' : 'w';
  const attackers = c.attackers(to, them);
  if (attackers.length === 0) return true;
  const guards = c.attackers(to, mover.color).filter((s) => s !== to);
  if (guards.length === 0) return false;
  return attackers.every((s) => VALUE[c.get(s)?.type ?? 'p'] >= VALUE[mover.type]);
}

export function answerDangerKey(fen: string): FairKey | null {
  const sq = pieceInDanger(fen);
  if (!sq) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const key = [...new Set(c.moves({ square: sq, verbose: true }).filter((m) => safeAfterMove(fen, sq, m.to)).map((m) => m.to))];
  return { key, nearMiss: [] };
}

export function answerDangerReason(fen: string, to: Square): string | null {
  const from = pieceInDanger(fen);
  if (!from) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const p = c.get(from);
  if (!p) return null;
  const probe = new Chess(fen);
  if (!probe.move({ from, to, promotion: 'q' })) return null;
  const them = p.color === 'w' ? 'b' : 'w';
  return probe.attackers(to, them).length === 0
    ? `On ${to} nothing of theirs attacks your ${name(p.type)}.`
    : `On ${to} your ${name(p.type)} is guarded, and nothing cheaper attacks it.`;
}

export function answerDangerShowLine(fen: string, key: readonly Square[], rot: number): string {
  const from = pieceInDanger(fen);
  const p = from ? new Chess(fen).get(from) : null;
  const open = rotateStem([
    'When a piece is in danger, answer it before anything else: move it, guard it, or block. First, where can it go and be safe?',
    'Found a piece in danger? The simplest answer is to move it — but only to a square where it is safe.',
  ], rot);
  const lead = p && from ? `Your ${name(p.type)} on ${from} is in danger.` : '';
  const reasons = key.map((sq) => answerDangerReason(fen, sq)).filter((r): r is string => !!r);
  return [open, lead, ...reasons].filter(Boolean).join(' ');
}

export function answerDangerPrompt(rot: number): string {
  return rotateStem([
    'One of your pieces is in danger. Tap every square it can go to and be safe.',
    'Save it: tap each safe square for your piece in danger.',
  ], rot);
}

export function answerDangerWrongTapLine(fen: string, sq: Square): string {
  const from = pieceInDanger(fen);
  if (!from) return 'Find the piece in danger first.';
  let c: Chess;
  try { c = new Chess(fen); } catch { return 'Check each square: who attacks it?'; }
  if (!c.moves({ square: from, verbose: true }).some((m) => m.to === sq)) return 'Your piece in danger cannot reach that square — look at where it can go.';
  return 'It can go there, but they can take it there — count who attacks that square.';
}

export function answerDangerKit(): StepKit {
  return {
    step: 'answer-danger',
    keyFor: answerDangerKey,
    showLine: answerDangerShowLine,
    prompt: answerDangerPrompt,
    wrongTapLine: answerDangerWrongTapLine,
    reasonFor: answerDangerReason,
    intro: 'Today: answering the danger. Spotting a piece in danger is half the job — the other half is the answer. We start with the simplest: move it to a safe square.',
  };
}
