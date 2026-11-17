/**
 * THE SKILL STEER (WO-SET-WEAKNESS-01, David 2026-11-17: "I want the coach to
 * be able to set user weaknesses during games. It should be able to read the
 * position and then calculate how to set up things the user needs to work on.
 * This should happen naturally, like the tactics focus but more broad and
 * natural").
 *
 * In a Learn focus game, among the moves the coach would play anyway
 * (`scoreCandidates` ranks only inside the strength window, so the coach never
 * plays below or above its level), it likes a move whose board asks the
 * student a POSITIONAL skill their record still needs — red or grey, never
 * green or amber (`needs`, read off the record by the page). Whether a board
 * asks a skill is the record's own read (`moveInsight.positionPosed`), so a
 * steer can only ever set up what the record would score. Tactics are the
 * focus scorer's (the defend seat and the plants); this one covers the rest:
 * castling and king safety, the rook's file, the misplaced piece, the trade
 * when behind, the pawn break's timing.
 *
 * Never a gift: a move that leaves a coach piece the student can win scores −1.
 * The focus scorer outranks it (its weight is lower), and a board it set up
 * counts as steered on the record (`replyMadeAChance`), like the focus's own.
 *
 * Pure: chess.js and the app's own computers, no engine.
 */
import { Chess } from 'chess.js';
import { registerScorer, type ScoringCandidate, type ScoringContext } from '../moveScoring';
import { isGift } from './focus';
import { positionPosed } from '../../services/moveInsight';
import { sideToMoveAs } from '../../services/threatOut';
import type { MisconceptionTagId } from '../../data/misconceptionTags';

declare module '../moveScoring' { interface ScorerIdMap { skillSteer: true } }

/** The positional skills a board can ask and the coach can set up by its own
 *  natural move — the tactics are the focus's. */
export const STEER_SKILLS: readonly MisconceptionTagId[] = [
  'king-stuck-center', 'weakened-king-safety', 'passive-rook', 'misplaced-piece', 'bad-trade', 'mistimed-pawn-break',
];

/** The skills on the board after the coach's `uci` that the student needs. */
export function posesNeededSkill(fen: string, uci: string, needs: ReadonlySet<MisconceptionTagId>): MisconceptionTagId[] {
  if (needs.size === 0) return [];
  let after: string;
  let san: string;
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (c.inCheck() || c.isGameOver()) return [];
    after = c.fen();
    san = mv.san;
  } catch { return []; }
  // What the board already asked the student before the coach moved (their
  // seat, the one null-move rule): a question already on the board is not one
  // this move set up.
  const student = fen.split(' ')[1] === 'w' ? 'b' : 'w';
  const theirSeat = sideToMoveAs(fen, student);
  const before = new Set(theirSeat ? positionPosed(theirSeat, {}).map((p) => p.tag) : []);
  return positionPosed(after, { lastMove: { fenBefore: fen, san } })
    .map((p) => p.tag)
    .filter((t) => needs.has(t) && !before.has(t));
}

/** THE STEER LOOKS A MOVE PAST ITSELF (David 2026-11-17: "calculate how to set
 *  up things"): a structure is rarely set in one move. When the move itself
 *  asks nothing, the coach's own line is read on — the student's best answer,
 *  then the coach's next move — and a needed skill asked there counts, at
 *  half the pull (it rests on the line being played). */
export function neededSkillAlong(fen: string, uci: string, line: readonly string[] | null, needs: ReadonlySet<MisconceptionTagId>): { skills: MisconceptionTagId[]; now: boolean } {
  const now = posesNeededSkill(fen, uci, needs);
  if (now.length > 0 || !line || line.length < 3 || line[0] !== uci) return { skills: now, now: true };
  try {
    const c = new Chess(fen);
    for (const u of line.slice(0, 2)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return { skills: posesNeededSkill(c.fen(), line[2], needs), now: false };
  } catch {
    return { skills: [], now: true };
  }
}

export function skillSteerScore(candidate: ScoringCandidate, ctx: ScoringContext): number {
  if (!ctx.focus || ctx.focus.needs.size === 0) return 0;
  if (isGift(ctx.fen, candidate.uci, ctx.coach)) return -1;
  const r = neededSkillAlong(ctx.fen, candidate.uci, candidate.line ?? null, ctx.focus.needs);
  return r.skills.length === 0 ? 0 : r.now ? 1 : 0.5;
}

registerScorer('skillSteer', skillSteerScore);
