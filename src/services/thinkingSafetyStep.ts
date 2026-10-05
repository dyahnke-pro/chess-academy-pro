// thinkingSafetyStep — "Am I safe?" of "Learn how to think".
//
// The habit taught (Heisman's "is it safe?"): before choosing a move, find
// every piece of YOURS they could win right now. The same SEE computer that
// grades "their targets" grades this, pointed at your own side (dual-use: the
// computer that finds their loose pieces finds yours).
//
// First pass: key = your pieces that lose material if they capture now
// (`findHangingBySee`, legal and pin-aware), never the king; near miss = a pawn
// in that state (pawn safety is a later lesson). A board where nothing of yours
// can be won is not used for this question.
// PURE: chess.js only.
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { findHangingBySee } from './positionReadingService';
import type { FairKey } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import { rotateStem } from '../utils/rotateStem';

const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';


export function safetyKey(fen: string): FairKey | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const me = chess.turn();
  const key: Square[] = [];
  const nearMiss: Square[] = [];
  for (const h of findHangingBySee(fen)) {
    if (h.color !== me || h.piece === 'k') continue;
    (h.piece === 'p' ? nearMiss : key).push(h.square);
  }
  return { key, nearMiss };
}

/** Why a key square is in danger, from the board. */
export function safetyReason(fen: string, sq: Square): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const p = chess.get(sq);
  if (!p) return null;
  const them = p.color === 'w' ? 'b' : 'w';
  const attackers = chess.attackers(sq, them);
  const defenders = chess.attackers(sq, p.color).filter((s) => s !== sq);
  if (attackers.length === 0) return null;
  const by = chess.get(attackers[0]);
  if (defenders.length === 0) {
    return `Your ${name(p.type)} on ${sq} is attacked and nothing guards it.`;
  }
  if (by && VALUE[by.type] < VALUE[p.type]) {
    return `Your ${name(p.type)} on ${sq} is guarded, but their ${name(by.type)} attacks it — the cheaper piece wins it anyway.`;
  }
  return `Your ${name(p.type)} on ${sq} is attacked ${attackers.length} times and guarded only ${defenders.length === 1 ? 'once' : `${defenders.length} times`}.`;
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export function safetyShowLine(fen: string, key: readonly Square[], rot: number): string {
  const open = rotateStem([
    'Before every move, check your own pieces first: for each one, who attacks it and who guards it?',
    'Safety first: go through your pieces and ask of each — could they take it right now and come out ahead?',
  ], rot);
  const reasons = key.map((sq) => safetyReason(fen, sq)).filter((r): r is string => !!r);
  return [open, ...reasons].join(' ');
}

export function safetyPrompt(rot: number): string {
  return rotateStem([
    'Tap every piece of yours they could win right now.',
    'Are you safe? Tap each of your pieces that is in danger.',
    'Which of your pieces could they win right now? Tap them.',
  ], rot);
}

export function safetyWrongTapLine(fen: string, sq: Square): string {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 'Count who attacks and who guards each of your pieces.'; }
  const me = chess.turn();
  const p = chess.get(sq);
  if (!p) return 'Tap the piece itself, not an empty square.';
  if (p.color !== me) return 'That one is theirs — the question is about yours.';
  if (p.type === 'k') return 'The king is never captured — look at the pieces around it.';
  const them = me === 'w' ? 'b' : 'w';
  const attackers = chess.attackers(sq, them).length;
  const defenders = chess.attackers(sq, me).filter((s) => s !== sq).length;
  if (attackers === 0) return `Nothing of theirs attacks that ${name(p.type)} right now.`;
  return `Count it: that ${name(p.type)} has ${attackers} attacker${attackers === 1 ? '' : 's'} and ${defenders} defender${defenders === 1 ? '' : 's'} — it holds.`;
}

export function safetyKit(): StepKit {
  return {
    step: 'am-i-safe',
    keyFor: safetyKey,
    showLine: safetyShowLine,
    prompt: safetyPrompt,
    wrongTapLine: safetyWrongTapLine,
    reasonFor: safetyReason,
    intro: 'Today: am I safe? Strong players check their own pieces before they look for anything else. Every piece: who attacks it, who guards it. Watch first.',
  };
}
