// THE PLAN CHOOSER (census #52). When the engine's two best lines carry
// DIFFERENT plans for the student, the choice between them is the lesson: two
// plans that hold equally ("pick the one you understand"), or one clearly
// stronger than the other, with what the weaker one costs. Both plans are read
// off lines the engine already computed (MultiPV) — no extra search.
import { Chess } from 'chess.js';
import { planFromUci } from './lookaheadPlan';
import { aimsOf } from './planArc';

/** The first full move a plan choice may be taught on. */
export const PLAN_CHOICE_FROM_MOVE = 10;

/** One line this much better than the next is a move to find, not a plan. */
export const SHARP_PLAN_GAP_CP = 150;

function opensForcing(fen: string, uci: string | undefined): boolean {
  if (!uci) return false;
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return !!m && (!!m.captured || /[+#]/.test(m.san));
  } catch { return false; }
}

export interface PlanChoiceLine { moves: readonly string[]; evaluation: number; mate?: number | null }

/** `lines` = the student's MultiPV at `fen` (student to move), best first,
 *  `evaluation` in White-POV centipawns. */
export function planChoice(fen: string, lines: readonly PlanChoiceLine[], studentColor: 'white' | 'black'): { text: string; key: string } | null {
  // A plan is chosen once the opening is played: at move 2 "two plans hold —
  // an attack on their king, or the bishop to a4" is noise (walk 2026-09-30,
  // game 2). Move 10 is where the pieces are out.
  if (Number(fen.split(' ')[5] ?? '1') < PLAN_CHOICE_FROM_MOVE) return null;
  const [l0, l1] = lines;
  if (!l0 || !l1 || l0.mate != null || l1.mate != null) return null;
  const p0 = planFromUci(fen, l0.moves, studentColor);
  const p1 = planFromUci(fen, l1.moves, studentColor);
  if (!p0 || !p1) return null;
  const a0 = aimsOf(p0.mine, 'student')[0];
  const a1 = aimsOf(p1.mine, 'student')[0];
  if (!a0 || !a1 || a0.id === a1.id) return null;
  const gap = Math.abs(l0.evaluation - l1.evaluation);
  // A PLAN IS QUIET PLAY (pass-2 walk 2026-09-30: "the stronger is an attack on
  // their king; the c-file falls 4.6 pawns short" — said mid-combination, with
  // …Nxd5 winning a pawn). When the best line opens with a capture or a check,
  // or one line is far better than the other, the position is about
  // calculation, not choosing a plan.
  if (gap >= SHARP_PLAN_GAP_CP || opensForcing(fen, l0.moves[0])) return null;
  const key = `plan-choice:${a0.id}|${a1.id}`;
  if (gap <= 30) {
    return { key, text: `Two plans hold here — ${a0.phrase}, or ${a1.phrase}. They come out level, so choose the one you understand and play it with purpose.` };
  }
  if (gap >= 80) {
    return { key, text: `Of the two plans on offer, the stronger is ${a0.phrase}; ${a1.phrase} falls about ${(gap / 100).toFixed(1)} pawns short.` };
  }
  return null;
}
