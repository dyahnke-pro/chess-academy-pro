// lessonSteer — the lesson game's quiet steer (David 2026-10-04: "a game played
// then that the coach can focus around the lessons done that day. It can play
// mistakes that directly set up the taught material (moves even, doesn't have
// to be mistakes)"; Play's opponent steers too, "Play still says nothing").
//
// Among the engine's own top moves that cost the coach no more than the
// strength window allows, prefer one that leaves the STUDENT a real moment for
// today's step on their next turn — judged by the same step computer that
// grades the lesson (dual-use: the computer that teaches "their targets" finds
// the move that hands them a target). Strength never drops to make room: a
// move outside the window is never chosen. A game gets a few such moments, the
// rest of its moves are natural.
//
// PURE: candidates (with their cost) and the step's key computer come in.
import { Chess } from 'chess.js';
import type { FairKey } from './thinkingPositions';
import { isFairKey } from './thinkingPositions';

export interface SteerCandidate {
  san: string;
  /** Centipawns this move costs the coach against its best move (≥ 0). */
  cpLoss: number;
}

/** Moments per game: enough to practise, few enough to stay a real game. */
export const LESSON_MOMENTS_PER_GAME = 4;

/** The most a steer may cost the coach, in centipawns, by the student's
 *  strength: a stronger student gets a tighter window (the steer must stay
 *  invisible against them). */
export function steerWindowCp(studentElo: number): number {
  if (studentElo < 1000) return 120;
  if (studentElo < 1600) return 80;
  if (studentElo < 2000) return 50;
  return 30;
}

/**
 * The coach move that leaves a fair question for `keyFor` on the student's
 * next turn, cheapest first; null when none fits the window (the coach then
 * plays its normal move).
 */
export function pickLessonMoment(
  fen: string,
  candidates: readonly SteerCandidate[],
  keyFor: (fenAfter: string) => FairKey | null,
  windowCp: number,
): SteerCandidate | null {
  const ordered = [...candidates].filter((c) => c.cpLoss <= windowCp).sort((a, b) => a.cpLoss - b.cpLoss);
  for (const c of ordered) {
    let after: string;
    try {
      const board = new Chess(fen);
      if (!board.move(c.san)) continue;
      if (board.isGameOver()) continue;
      after = board.fen();
    } catch { continue; }
    let k: FairKey | null = null;
    try { k = keyFor(after); } catch { k = null; }
    if (isFairKey(k)) return c;
  }
  return null;
}

/** The engine's top lines as steer candidates: each line's first move and what
 *  it costs the side to move against the best line (evals are white-POV). */
export function candidatesFromLines(
  fen: string,
  lines: readonly { evaluation: number; moves: readonly string[]; mate: number | null }[],
): SteerCandidate[] {
  if (lines.length === 0) return [];
  let mover: 'w' | 'b';
  try { mover = new Chess(fen).turn(); } catch { return []; }
  const pov = (l: { evaluation: number; mate: number | null }): number =>
    (l.mate !== null ? Math.sign(l.mate) * 100000 : l.evaluation) * (mover === 'w' ? 1 : -1);
  const best = Math.max(...lines.map(pov));
  const out: SteerCandidate[] = [];
  for (const l of lines) {
    const uci = l.moves[0];
    if (!uci) continue;
    try {
      const c = new Chess(fen);
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      out.push({ san: m.san, cpLoss: Math.max(0, best - pov(l)) });
    } catch { /* not legal here — skip */ }
  }
  return out;
}
