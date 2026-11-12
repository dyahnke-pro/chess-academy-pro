// planSteps — THE PLAN'S NEXT STEPS (WO-OPENINGS-REWRITE-01 composer, David
// 2026-11-12: the writers say "Bd3 and Qc2, both aimed at h7, then castle";
// "they just need to get done"). Read off the engine's best line after a move:
// the mover's own next quiet moves, and what they build together — a square
// they all aim at, a pawn break they prepare, castling to finish. Said only
// when the line is quiet (no capture or check in its first plies): a line of
// captures is a tactic, which other computers say.
//
// PURE: chess.js and the line only. Dual use: the same steps a lesson teaches
// are the steps a student's game can be checked against.
import { Chess, type Color, type Square } from 'chess.js';
import { isPawnBreak } from './pawnBreak';

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king', p: 'pawn' };

export interface PlanStep { san: string; piece: string; to: string; castle: boolean; brk: boolean }
export interface PlanSteps {
  /** The mover's next moves in the line, in order (2–3). */
  steps: PlanStep[];
  /** A square two or more of the moved pieces attack at the plan's end, with
   *  something of the other side on it or next to their king. */
  aim: string | null;
  /** What stands on the aim: a piece of the other side, or null for an empty
   *  square next to their king. The owner is said from the STUDENT's seat in
   *  `planStepsText` (their plan aims at YOUR knight). */
  aimPiece: string | null;
  /** The whole line played to the plan's last step (UCI), for the proof. */
  line: string[];
  squares: string[];
}

/** The plan in the engine's line from `fenAfter` (the other side to move):
 *  `line` is UCI, their reply first; `played` the move that made `fenAfter`
 *  (UCI), or null when unknown. Null when the line is not quiet, or the
 *  mover's next moves are fewer than two. */
export function planSteps(fenAfter: string, line: readonly string[], lastMove: string | null, maxSteps = 3): PlanSteps | null {
  const board = new Chess(fenAfter);
  const mover: Color = board.turn() === 'w' ? 'b' : 'w';
  const steps: PlanStep[] = [];
  const played: string[] = [];
  for (let i = 0; i < line.length && steps.length < maxSteps; i += 1) {
    const u = line[i];
    const before = board.fen();
    let mv;
    try { mv = board.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined }); } catch { break; }
    played.push(u);
    // A capture or a check in the plan's stretch is a fight, not a plan.
    if (mv.captured || mv.san.includes('+') || mv.san.includes('#')) return null;
    if (mv.color !== mover) continue;
    steps.push({ san: mv.san, piece: PIECE[mv.piece], to: mv.to, castle: mv.san.startsWith('O-O'), brk: mv.piece === 'p' && isPawnBreak(before, mv.san, null) });
  }
  if (steps.length < 2) return null;
  // THE AIM: a square of theirs two or more of the moved pieces now hit.
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  const theirKing = board.board().flat().find((p) => p && p.type === 'k' && p.color === enemy)?.square ?? null;
  const near = (sq: string): boolean => !!theirKing && Math.abs(sq.charCodeAt(0) - theirKing.charCodeAt(0)) <= 1 && Math.abs(Number(sq[1]) - Number(theirKing[1])) <= 1;
  const counts = new Map<string, number>();
  for (const s of steps) {
    if (s.castle) continue;
    const at = board.get(s.to as Square);
    if (!at || at.color !== mover || at.type === 'p') continue;
    for (const sq of attacksFrom(board, s.to)) counts.set(sq, (counts.get(sq) ?? 0) + 1);
  }
  let aim: string | null = null; let aimPiece: string | null = null;
  for (const [sq, n] of counts) {
    if (n < 2) continue;
    const p = board.get(sq as Square);
    const target = (p && p.color === enemy && p.type !== 'k') || (!p && near(sq));
    if (!target) continue;
    aim = sq;
    aimPiece = p ? PIECE[p.type] : null;
    if (p && p.type === 'p' && near(sq)) break;
  }
  const brk = steps.some((s) => s.brk);
  // Steps with nothing that ties them — no square they aim at, no break they
  // build to — are moves, not a plan. "Be7, castling and then Nc6, to finish
  // developing" said on every quiet move was filler (decision baseline
  // 2026-11-12): finishing development is what every move of an opening does.
  if (!aim && !brk) return null;
  // A plan tied only by the break the move just played prepares is that
  // move's own job said again ("Your c3 prepares d4 … and then the d4
  // break"): one idea, said once, by the move.
  if (!aim && lastMove) {
    const brkStep = steps.find((s) => s.brk);
    const by = board.get(lastMove.slice(2, 4) as Square);
    if (brkStep && by && by.type === 'p' && by.color === mover) {
      const f = lastMove.charCodeAt(2) - 97; const r = Number(lastMove[3]); const d = mover === 'w' ? 1 : -1;
      const guards = [f - 1, f + 1].filter((x) => x >= 0 && x < 8).map((x) => `${String.fromCharCode(97 + x)}${r + d}`);
      if (guards.includes(brkStep.to)) return null;
    }
  }
  return { steps, aim, aimPiece, line: played, squares: [...steps.map((s) => s.to), ...(aim ? [aim] : [])] };
}

/** The squares a piece on `sq` bears on: the knight's jumps, the king's
 *  steps, and a slider's rays — read THROUGH its own slider standing behind
 *  on the same line (a battery: Qc2 behind Bd3 bears on h7), stopping at the
 *  first other piece. */
function attacksFrom(board: Chess, sq: string): string[] {
  const p = board.get(sq as Square);
  if (!p) return [];
  const f0 = sq.charCodeAt(0) - 97; const r0 = Number(sq[1]) - 1;
  const at = (f: number, r: number): string | null => (f >= 0 && f < 8 && r >= 0 && r < 8 ? `${String.fromCharCode(97 + f)}${r + 1}` : null);
  const out: string[] = [];
  if (p.type === 'n' || p.type === 'k') {
    const d = p.type === 'n' ? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [df, dr] of d) { const t = at(f0 + df, r0 + dr); if (t) out.push(t); }
    return out;
  }
  const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dirs = p.type === 'b' ? diag : p.type === 'r' ? straight : p.type === 'q' ? [...diag, ...straight] : [];
  for (const [df, dr] of dirs) {
    const isDiag = df !== 0 && dr !== 0;
    for (let k = 1; k < 8; k += 1) {
      const t = at(f0 + df * k, r0 + dr * k);
      if (!t) break;
      out.push(t);
      const q = board.get(t as Square);
      if (!q) continue;
      const alongMine = q.color === p.color && (q.type === 'q' || (isDiag ? q.type === 'b' : q.type === 'r'));
      if (!alongMine) break;
    }
  }
  return out;
}

/** The plan in words, from the student's seat. The break is named once, in
 *  its place among the steps ("Bd3, Bc2 and then the d4 break") — never the
 *  move and again as what it builds to. */
export function planStepsText(p: PlanSteps, whose: 'your' | 'their'): string {
  const named = p.steps.map((s) => (s.castle ? 'castling' : s.brk ? `the ${s.san} break` : s.san));
  const list = named.length === 2 ? `${named[0]} and then ${named[1]}` : `${named.slice(0, -1).join(', ')} and then ${named.at(-1)}`;
  // The target belongs to the OTHER side from the planner: your plan aims at
  // their pieces, theirs at yours.
  const owner = whose === 'your' ? 'their' : 'your';
  const why = p.aim ? `, the pieces lining up on ${p.aimPiece ? `${owner} ${p.aimPiece} on ${p.aim}` : `${p.aim}, next to ${owner} king`}` : '';
  return `${whose === 'your' ? 'Your' : 'Their'} plan from here: ${list}${why}.`;
}

/** The plan's say-once key: one plan per aim or break and mover, so the same
 *  plan is not said again a move later with its steps shifted by one. */
export function planStepsKey(p: PlanSteps, mover: 'w' | 'b'): string {
  const brk = p.steps.find((s) => s.brk);
  return `plan-steps:${mover}:${p.aim ? `aim:${p.aim}` : `break:${brk?.to ?? ''}`}`;
}

/** The UCI of `san` played on `fenBefore`, or null — the `played` a caller
 *  that holds the move as SAN passes. */
export function playedUci(fenBefore: string, san: string): string | null {
  try { const m = new Chess(fenBefore).move(san); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
}
