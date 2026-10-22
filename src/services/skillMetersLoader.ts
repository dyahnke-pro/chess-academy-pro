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
import { evidenceMirror, slipMirror } from './recordMirror';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { computeSkillMeters, eventsFromRecord, isLiveSlip, type HeldRow, type SlipRow, type SkillMeter, type SkillMeterId } from './skillMeters';
import { idleYield } from './backfillSchedule';
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

/** A slip row as stored: its id and the kept meter verdict. */
export type StoredSlip = SlipRow & { id: string; skillBreak?: { key: string; breaks: boolean } };

export interface SkillRows {
  held: Array<HeldRow & { id: string }>;
  slips: StoredSlip[];
  startRating: number;
}

/** Background rows: a game analysed after the fact, not a move made now. */
export function isBackgroundRow(r: { origin?: string; source?: string }): boolean {
  return r.origin === 'review' || r.source === 'auto-analysis' || r.source === 'game-review';
}

export async function readSkillRows(): Promise<SkillRows> {
  // The rows come from the mirror (read once per session, patched by each
  // write): the meter watcher re-reads after every move, and pulling both
  // whole tables out of IndexedDB each time was one of five such reads
  // (2026-10-21). Copies of the snapshots — the meters' row arrays are theirs.
  const [held, slips, profile] = await Promise.all([
    evidenceMirror.rows().catch(() => []),
    slipMirror.rows().catch(() => []),
    db.profiles.toCollection().first().catch(() => undefined),
  ]);
  return {
    held: [...held] as Array<HeldRow & { id: string }>,
    slips: await warmSlipBreaks([...slips] as unknown as StoredSlip[]),
    startRating: profile?.currentRating ?? DEFAULT_STUDENT_RATING,
  };
}

/** What the verdict depends on besides the board: a re-attribution or a
 *  re-measured cost changes it. */
function verdictKey(r: SlipRow): string {
  return `${r.tag}|${typeof r.cpLoss === 'number' ? r.cpLoss : ''}|${r.grade ?? ''}`;
}
/** Verdicts already computed this session, keyed by board, move and verdict
 *  key — the same inputs give the same answer, so nothing here goes stale. */
const VERDICTS = new Map<string, boolean>();
const memoKey = (r: SlipRow): string => `${r.fen}|${r.playedSan}|${verdictKey(r)}`;

/**
 * THE METERS NEVER RE-RUN THE BOARD OVER THE RECORD (prod Learn on a real
 * record, 2026-10-19: a 6–8 second freeze every 7 seconds, at rest). Each
 * record write refreshed the meters, and every refresh ran the board detectors
 * over every past live slip, twice — a pure function of an unchanging row,
 * recomputed thousands of times on the main thread. Now each slip is judged
 * once: kept on the row, remembered for the session, and the first pass yields
 * between rows so the board never waits on it.
 */
let warming: Promise<unknown> = Promise.resolve();
export function warmSlipBreaks(slips: StoredSlip[]): Promise<StoredSlip[]> {
  const run = warming.then(async () => {
    const kept: Array<{ key: string; changes: { skillBreak: { key: string; breaks: boolean } } }> = [];
    for (const r of slips) {
      if (!isLiveSlip(r) || r.grade === 'inaccuracy') continue;
      const vk = verdictKey(r);
      if (r.skillBreak?.key === vk) { VERDICTS.set(memoKey(r), r.skillBreak.breaks); continue; }
      if (!VERDICTS.has(memoKey(r))) await idleYield();
      const breaks = liveSlipBreaks(r);
      r.skillBreak = { key: vk, breaks };
      kept.push({ key: r.id, changes: { skillBreak: r.skillBreak } });
    }
    for (let i = 0; i < kept.length; i += 25) {
      await db.misconceptionTags.bulkUpdate(kept.slice(i, i + 25)).catch(() => 0);
    }
    return slips;
  });
  warming = run.catch(() => undefined);
  return run;
}

/** A live slip breaks its skill only where the record's one scoring would:
 *  the board posed that skill and the move's MEASURED cost makes it a
 *  mistake. A slip under a pawn is a clean answer to the record and to the
 *  calibration alike (`movePlayedCleanly`), so it never counts against the
 *  meter here either — 15 of one student's 23 live king-safety "slips" cost
 *  under a pawn, and counting them read their King safety at 600. */
export function liveSlipBreaks(r: SlipRow & { skillBreak?: { key: string; breaks: boolean } }): boolean {
  if (r.grade === 'inaccuracy') return false;
  if (r.skillBreak?.key === verdictKey(r)) return r.skillBreak.breaks;
  const mk = memoKey(r);
  const known = VERDICTS.get(mk);
  if (known !== undefined) return known;
  const mover = r.fen.split(' ')[1] === 'b' ? 'black' : 'white';
  let breaks = false;
  try {
    breaks = capabilityOutcomes({ fenBefore: r.fen, playedSan: r.playedSan, moverColor: mover, cpLoss: typeof r.cpLoss === 'number' ? r.cpLoss : MISTAKE_CP, slipTag: r.tag })
      .some((o) => o.tag === r.tag && o.outcome === 'broken');
  } catch { /* an unreadable board breaks nothing */ }
  VERDICTS.set(mk, breaks);
  return breaks;
}

/** The nine meters from a set of rows. */
export function metersFrom(rows: Pick<SkillRows, 'held' | 'slips' | 'startRating'>): SkillMeter[] {
  return computeSkillMeters(eventsFromRecord(rows.held, rows.slips, skillDifficulty, liveSlipBreaks), rows.startRating);
}

export async function loadSkillMeters(): Promise<SkillMeter[]> {
  return metersFrom(await readSkillRows());
}

export type { SkillMeter, SkillMeterId };
