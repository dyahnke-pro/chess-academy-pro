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
import { describeMoveGeometry } from './groundedAnswer';

const PIECE_NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};


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
  /** Escalating hint LADDER (David 2026-07-20, Danya's "it's a knight move —
   *  that's the hint I'll give", then more if you stall). Each tap of Hint
   *  reveals the next rung; the LAST rung is the full answer. Rung 0 gives the
   *  piece, rung 1 the from-square, rung 2 the move — grounded, no leak until
   *  the student asks. */
  hintLadder: string[];
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
  const hint = `The holding move is ${p.san}${why ? ` — it ${why}` : ''}.`;
  return {
    question: `This was the last moment the game was still in your hands. Your ${p.pieceName} keeps it together — where does it need to be?`,
    answerSan: p.san,
    from: p.from,
    to: p.to,
    fen,
    hint,
    // Same escalating ladder as the find-the-shot: piece → from-square → move.
    hintLadder: [
      `It's a ${p.pieceName} move.`,
      `The ${p.pieceName} you want comes from ${p.from}.`,
      hint,
    ],
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
