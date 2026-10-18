/**
 * skillMetersLoader — the impure half of the skill meters: reads the SAME two
 * records the heat map reads (`capabilityEvidence`, `misconceptionTags`) and
 * the calibrated difficulty table, and folds them through the pure computer.
 * Kept apart from `skillMeters.ts` so that leaf stays testable without a DB.
 *
 * A skill with no calibrated difficulty scores nothing: an honest "we cannot
 * say how hard that was" beats a guessed number on the student's level.
 */
import { db } from '../db/schema';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { computeSkillMeters, eventsFromRecord, type HeldRow, type SlipRow, type SkillMeter, type SkillMeterId } from './skillMeters';
import calibration from '../data/skill-difficulty.json';
import { capabilityOutcomes } from './capabilityEvidence';
import { MISTAKE_CP } from './engineConstants';

interface Calibrated { D: number; S: number; n: number }
const TABLE = (calibration as { table: Record<string, Calibrated> }).table;

/** The question's difficulty and steepness for a skill, or null when the
 *  population never gave enough answers to say. */
export function skillDifficulty(tag: string): { difficulty: number; scale: number } | null {
  const c = TABLE[tag];
  return c ? { difficulty: c.D, scale: c.S } : null;
}

export interface SkillRows {
  held: Array<HeldRow & { id: string }>;
  slips: Array<SlipRow & { id: string }>;
  startRating: number;
}

/** Background rows: a game analysed after the fact, not a move made now. */
export function isBackgroundRow(r: { origin?: string; source?: string }): boolean {
  return r.origin === 'review' || r.source === 'auto-analysis' || r.source === 'game-review';
}

export async function readSkillRows(): Promise<SkillRows> {
  const [held, slips, profile] = await Promise.all([
    db.capabilityEvidence.toArray().catch(() => []),
    db.misconceptionTags.toArray().catch(() => []),
    db.profiles.toCollection().first().catch(() => undefined),
  ]);
  return {
    held: held as Array<HeldRow & { id: string }>,
    slips: slips as unknown as Array<SlipRow & { id: string }>,
    startRating: profile?.currentRating ?? DEFAULT_STUDENT_RATING,
  };
}

/** A live slip breaks its skill only where the record's one scoring would:
 *  the board posed that skill and the move was a real cost (an inaccuracy is
 *  a clean answer to the record and to the calibration alike). */
export function liveSlipBreaks(r: SlipRow): boolean {
  if (r.grade === 'inaccuracy') return false;
  const mover = r.fen.split(' ')[1] === 'b' ? 'black' : 'white';
  try {
    return capabilityOutcomes({ fenBefore: r.fen, playedSan: r.playedSan, moverColor: mover, cpLoss: MISTAKE_CP, slipTag: r.tag })
      .some((o) => o.tag === r.tag && o.outcome === 'broken');
  } catch {
    return false;
  }
}

/** The nine meters from a set of rows. */
export function metersFrom(rows: Pick<SkillRows, 'held' | 'slips' | 'startRating'>): SkillMeter[] {
  return computeSkillMeters(eventsFromRecord(rows.held, rows.slips, skillDifficulty, liveSlipBreaks), rows.startRating);
}

export async function loadSkillMeters(): Promise<SkillMeter[]> {
  return metersFrom(await readSkillRows());
}

export type { SkillMeter, SkillMeterId };
