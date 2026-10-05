// thinkingHitTwoStep — step 7, "Hit two at once".
//
// The habit taught: one move that attacks two targets wins one of them, because
// the defender can save only one. Tap every square a piece of yours can go to
// and hit two things at once.
//
// The key is the app's ONE verified fork check (`moveIsTheFork` →
// `verifyForkOnBoard`: SEE + tempo, a fork that wins nothing is not a fork) —
// the same computer the Setup Trainer and review use. No new detector.
//
// First pass: forks of two or more non-pawn pieces. A check that also hits a
// piece (the royal fork) is a later sub-question.
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { moveIsTheFork } from './setupTrainerService';
import type { FairKey } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import { andList } from '../utils/andList';
import { rotateStem } from '../utils/rotateStem';


const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';

/** Moves of the side to move that land on a verified fork square. */
function forkMoves(fen: string): { to: Square; piece: PieceSymbol; targets: Square[] }[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  if (chess.inCheck()) return [];
  const out: { to: Square; piece: PieceSymbol; targets: Square[] }[] = [];
  for (const m of chess.moves({ verbose: true })) {
    const probe = new Chess(fen);
    probe.move(m.san);
    if (!moveIsTheFork(probe.fen(), m.to)) continue;
    const parts = probe.fen().split(' ');
    parts[1] = m.color;
    parts[3] = '-';
    let targets: Square[] = [];
    try {
      targets = new Chess(parts.join(' ')).moves({ square: m.to, verbose: true })
        .filter((x) => x.captured && x.captured !== 'p')
        .map((x) => x.to);
    } catch { targets = []; }
    out.push({ to: m.to, piece: m.piece, targets: [...new Set(targets)] });
  }
  return out;
}

export function hitTwoKey(fen: string): FairKey | null {
  const forks = forkMoves(fen);
  return { key: [...new Set(forks.map((f) => f.to))], nearMiss: [] };
}

export function hitTwoReason(fen: string, sq: Square): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const f = forkMoves(fen).find((x) => x.to === sq);
  if (!f) return null;
  const hit = f.targets.map((t) => `the ${name(chess.get(t)?.type ?? 'p')} on ${t}`);
  return `From ${sq} your ${name(f.piece)} hits ${andList(hit)} — they can save only one.`;
}

export function hitTwoShowLine(fen: string, key: readonly Square[], rot: number): string {
  const open = rotateStem([
    'Look for a square where one of your pieces attacks two of theirs at once. They can only save one.',
    'Two targets, one move: find a square that hits two of their pieces, and one of them falls.',
  ], rot);
  const reasons = key.map((sq) => hitTwoReason(fen, sq)).filter((r): r is string => !!r);
  return [open, ...reasons].join(' ');
}

export function hitTwoPrompt(rot: number): string {
  return rotateStem([
    'Tap every square where a piece of yours would hit two of theirs at once.',
    'Find the double attack: tap each square that hits two targets.',
  ], rot);
}

export function hitTwoWrongTapLine(fen: string, sq: Square): string {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 'From each square, count what your piece would attack.'; }
  if (!chess.moves({ verbose: true }).some((m) => m.to === sq)) return 'None of your pieces can get there — look at where each one can go.';
  return 'From there your piece hits at most one thing they cannot cover — count what it attacks, and what is guarded.';
}

export function hitTwoKit(): StepKit {
  return {
    step: 'hit-two',
    keyFor: hitTwoKey,
    showLine: hitTwoShowLine,
    prompt: hitTwoPrompt,
    wrongTapLine: hitTwoWrongTapLine,
    reasonFor: hitTwoReason,
    intro: 'Today: hitting two at once. Once you know their targets, look for one move that attacks two of them — they can only save one.',
  };
}
