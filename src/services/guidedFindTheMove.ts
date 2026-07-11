// guidedFindTheMove — P2 of the coach-voice faucet
// (docs/plans/2026-07-06-coach-voice-why-faucet.md; David 2026-07-11: "I would
// love for the coach to ask the user questions").
//
// WINNING / KEEP-PRESSING = a GUIDED FIND-THE-MOVE, never a handed answer.
// When the student is clearly better and the position has a real shot, the
// coach names the PIECE and the GOAL and WITHHOLDS the square — the student
// answers by playing the move on the board. Right → press on; wrong → take it
// back and look again; stuck → Hint reveals the square.
//
// G0 + the honesty contract by construction: everything here is computed with
// chess.js + the engine's best move. The QUESTION never contains the answer
// square (asserted by test), and the LLM narration layer is handed ONLY the
// question — never the answer — so it cannot leak what it does not know.

import { Chess } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { describeMoveGeometry } from './groundedAnswer';

const PIECE_NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Student is clearly better and should be pressing (mover-POV centipawns). */
export const GUIDED_FIND_MIN_EVAL_CP = 150;
/** Don't quiz in near-forced positions — a "find it" needs real choice. */
export const GUIDED_FIND_MIN_LEGAL_MOVES = 8;

export interface GuidedFindChallenge {
  /** Square-free question — names the piece + the goal, never the square. */
  question: string;
  answerSan: string;
  from: string;
  to: string;
  /** The FEN the challenge was built for (student to move). Judging verifies
   *  the board hasn't drifted before scoring an attempt. */
  fen: string;
  /** The reveal spoken on Hint — names the move + why. */
  hint: string;
  /** Spoken when the student finds it. */
  confirm: string;
  /** Spoken on a wrong attempt (the move is taken back). */
  retry: string;
}

interface ProbedBest {
  san: string;
  from: string;
  to: string;
  pieceName: string;
  isCapture: boolean;
  isMate: boolean;
  isCheck: boolean;
  fenAfter: string;
}

function probeBest(fen: string, bestUci: string): ProbedBest | null {
  if (!bestUci || bestUci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci.length > 4 ? bestUci[4] : undefined });
    return {
      san: mv.san,
      from: mv.from,
      to: mv.to,
      pieceName: PIECE_NAME[mv.piece] ?? 'piece',
      isCapture: !!mv.captured,
      isMate: c.isCheckmate(),
      isCheck: c.isCheck(),
      fenAfter: c.fen(),
    };
  } catch {
    return null;
  }
}

/** The tactic the best move lands, if any ('fork' | 'pin' | 'skewer' | …). */
function landedTactic(fenAfter: string): string | null {
  try {
    const t = detectTactics(fenAfter).tactics.find((x) => x.type !== 'none');
    return t ? t.type : null;
  } catch {
    return null;
  }
}

/**
 * Gate: is THIS a moment worth turning into a question? Deterministic —
 * the student is clearly winning/pressing, the position has real choice, and
 * the engine's move is NOTABLE (mate / capture / check / lands a tactic).
 * Quiet "improve a piece" moves don't quiz in v1 — a question needs a payoff
 * the student can feel when they find it.
 */
export function shouldOfferGuidedFind(opts: {
  fen: string;
  bestUci: string | undefined;
  /** Engine eval of `fen` from the STUDENT's perspective, centipawns. */
  evalCpStudentPov: number | null;
}): boolean {
  if (typeof opts.evalCpStudentPov !== 'number' || opts.evalCpStudentPov < GUIDED_FIND_MIN_EVAL_CP) return false;
  if (!opts.bestUci) return false;
  const probed = probeBest(opts.fen, opts.bestUci);
  if (!probed) return false;
  try {
    if (new Chess(opts.fen).moves().length < GUIDED_FIND_MIN_LEGAL_MOVES) return false;
  } catch {
    return false;
  }
  return probed.isMate || probed.isCapture || probed.isCheck || landedTactic(probed.fenAfter) !== null;
}

/**
 * Build the challenge. The question names the PIECE + GOAL and withholds the
 * square (the doctrine's three rules). Returns null when the move can't be
 * probed — empty > generic > invented.
 */
export function buildGuidedFindChallenge(fen: string, bestUci: string): GuidedFindChallenge | null {
  const p = probeBest(fen, bestUci);
  if (!p) return null;

  const tactic = landedTactic(p.fenAfter);
  let question: string;
  if (p.isMate) {
    question = `You have a checkmate on the board — your ${p.pieceName} delivers it. Where?`;
  } else if (tactic === 'fork') {
    question = `Your ${p.pieceName} can land a fork here. What's the square?`;
  } else if (p.isCapture && p.isCheck) {
    question = `Your ${p.pieceName} has a capture that comes with check. Find it.`;
  } else if (p.isCapture) {
    question = `There's material to be won, and your ${p.pieceName} does the taking. Where does it strike?`;
  } else if (p.isCheck) {
    question = `Your ${p.pieceName} has a forcing check. Find the square.`;
  } else {
    // tactic !== null (pin/skewer/other) — gate guarantees one of these paths.
    question = `Your ${p.pieceName} can land a ${tactic}. What's the square?`;
  }

  // The reveal names the move + WHY (computed geometry) — only ever shown on
  // Hint or after the student has committed an attempt.
  let why: string | null = null;
  try {
    const mover: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
    why = describeMoveGeometry(fen, p.san, mover);
  } catch { /* geometry is a bonus */ }
  const hint = `The move is ${p.san}${why ? ` — it ${why}` : ''}.`;

  return {
    question,
    answerSan: p.san,
    from: p.from,
    to: p.to,
    fen,
    hint,
    confirm: `There it is — ${p.san}.`,
    retry: 'Not quite — take another look. Same piece, better square.',
  };
}

/**
 * The HOLD variant — the blunder-rewind question (David 2026-07-11: "return
 * to the last moment you had a choice"). No notability gate: the holding move
 * is often quiet, and that IS the lesson. Same challenge shape, so it drops
 * straight into the find-the-shot board machinery.
 */
export function buildHoldChallenge(fen: string, bestUci: string): GuidedFindChallenge | null {
  const p = probeBest(fen, bestUci);
  if (!p) return null;
  let why: string | null = null;
  try {
    const mover: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
    why = describeMoveGeometry(fen, p.san, mover);
  } catch { /* geometry is a bonus */ }
  return {
    question: `This was the last moment the game was still in your hands. Your ${p.pieceName} keeps it together — where does it need to be?`,
    answerSan: p.san,
    from: p.from,
    to: p.to,
    fen,
    hint: `The holding move is ${p.san}${why ? ` — it ${why}` : ''}.`,
    confirm: `There it is — ${p.san}. That keeps the game.`,
    retry: 'Not quite — the position can still be held. Look again.',
  };
}

/**
 * Judge a board attempt against the challenge. 'found' when the student plays
 * the answer (SAN match, or same piece path from→to — covers promotion/check
 * suffix differences). 'stale' when the board has drifted from the challenge
 * position (walkthrough jump, reset) — the caller silently clears. Otherwise
 * 'retry' — take the move back and look again.
 */
export function judgeGuidedFindAttempt(
  challenge: GuidedFindChallenge,
  attempt: { san: string; from?: string; to?: string; fenBefore: string },
): 'found' | 'retry' | 'stale' {
  if (attempt.fenBefore !== challenge.fen) return 'stale';
  if (attempt.san === challenge.answerSan) return 'found';
  if (attempt.from && attempt.to && attempt.from === challenge.from && attempt.to === challenge.to) return 'found';
  return 'retry';
}
