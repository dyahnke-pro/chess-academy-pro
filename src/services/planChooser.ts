// THE PLAN CHOOSER (census #52). When the engine's two best lines carry
// DIFFERENT plans for the student, the choice between them is the lesson: two
// plans that hold equally ("pick the one you understand"), or one clearly
// stronger than the other, with what the weaker one costs. Both plans are read
// off lines the engine already computed (MultiPV) — no extra search.
import { costWords } from './engineConstants';
import { Chess } from 'chess.js';
import { planFromUci } from './lookaheadPlan';
import { aimWalkableNow, aimsOf, type Aim } from './planArc';
import { routeNoun } from '../utils/routeWords';

/** The first full move a plan choice may be taught on. */
const PLAN_CHOICE_FROM_MOVE = 10;

/** One line this much better than the next is a move to find, not a plan. */
const SHARP_PLAN_GAP_CP = 150;

function opensForcing(fen: string, uci: string | undefined): boolean {
  if (!uci) return false;
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return !!m && (!!m.captured || /[+#]/.test(m.san));
  } catch { return false; }
}

export interface PlanChoiceLine { moves: readonly string[]; evaluation: number; mate?: number | null; searchedShort?: boolean }

/** `lines` = the student's MultiPV at `fen` (student to move), best first,
 *  `evaluation` in White-POV centipawns. */
export function planChoice(
  fen: string, lines: readonly PlanChoiceLine[], studentColor: 'white' | 'black',
  /** The move that produced `fen` — see `planFromUci`. REQUIRED. */
  lastMove: { fenBefore: string; san: string } | null,
): { text: string; key: string } | null {
  // A plan is chosen once the opening is played: at move 2 "two plans hold —
  // an attack on their king, or the bishop to a4" is noise (walk 2026-09-30,
  // game 2). Move 10 is where the pieces are out.
  if (Number(fen.split(' ')[5] ?? '1') < PLAN_CHOICE_FROM_MOVE) return null;
  const [l0, l1] = lines;
  if (!l0 || !l1 || l0.mate != null || l1.mate != null) return null;
  const p0 = planFromUci(fen, l0.moves, studentColor, lastMove);
  const p1 = planFromUci(fen, l1.moves, studentColor, lastMove);
  if (!p0 || !p1) return null;
  // An OUTPOST, a PASSED PAWN and an ATTACK ON THE KING are facts about the
  // board now — a square a pawn holds is no outpost (Learn walk 2026-10-02:
  // "the outpost on h5" with White's pawn on h5), and a pawn with an enemy pawn
  // in front on the next file is not "the passed pawn" (clean-pass walk
  // mZ1GOTOw, 33…: f7 with White's e5 in front). Routes may need the line's
  // own preparation (d3 before Nd2), so a route alone is not held to the board.
  const seat: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const sayable = (a: ReturnType<typeof aimsOf>[number]): boolean => a.kind === 'route' || aimWalkableNow(a, fen, seat);
  const a0 = aimsOf(p0.mine, 'student').find(sayable);
  const a1 = aimsOf(p1.mine, 'student').find(sayable);
  if (!a0 || !a1 || a0.id === a1.id) return null;
  const gap = Math.abs(l0.evaluation - l1.evaluation);
  // A PLAN IS QUIET PLAY (pass-2 walk 2026-09-30: "the stronger is an attack on
  // their king; the c-file falls 4.6 pawns short" — said mid-combination, with
  // …Nxd5 winning a pawn). When the best line opens with a capture or a check,
  // or one line is far better than the other, the position is about
  // calculation, not choosing a plan.
  if (gap >= SHARP_PLAN_GAP_CP || opensForcing(fen, l0.moves[0])) return null;
  const key = `plan-choice:${a0.id}|${a1.id}`;
  // LEARN NAMES NO MOVE UNASKED (David 2026-10-18: "getting the bishop to f5,
  // by way of g4" drew Bf3-g4 before he moved). A route's first hop is the
  // student's next move, so the waypoints are held; the goal square is the plan.
  const said = (a: Aim): string => a.kind === 'route' && a.route
    ? routeNoun({ ...a.route, path: [a.route.path[0], a.route.path[a.route.path.length - 1]] })
    : a.phrase;
  // "level" and "by N" are the gap said aloud: only off lines searched to the
  // depth the read asked for (OS-11) — a cut read names the plans, no amount.
  const earned = !l0.searchedShort && !l1.searchedShort;
  if (gap <= 30) {
    return { key, text: earned
      ? `Two plans hold here — ${said(a0)}, or ${said(a1)}. They come out level, so choose the one you understand and play it with purpose.`
      : `Two plans are on offer here — ${said(a0)}, or ${said(a1)}. Choose the one you understand and play it with purpose.` };
  }
  if (gap >= 80) {
    return { key, text: `Of the two plans on offer, the stronger is ${said(a0)}; ${said(a1)} falls short${earned ? ` by ${costWords(gap)}` : ''}.` };
  }
  return null;
}
