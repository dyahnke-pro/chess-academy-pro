/**
 * inaccuracyVoice — whether the coach speaks the student's INACCURACY here,
 * decided by their own record, as personally as the record allows (David
 * 2026-10-18: "A weaker player doesn't need to be told about slips when they
 * are blundering. Stronger players that don't blunder get the narrations.
 * Separate by phase of game… I want it as personalized as it can be.").
 *
 * THE RULE: in the student's record, when their mistakes and blunders are at
 * least as many as their inaccuracies, the big errors come first and the
 * inaccuracy stays quiet; otherwise it speaks. Read at the most specific level
 * the record can answer:
 *   1. this PHASE and this SKILL (the inaccuracy's own tag);
 *   2. this PHASE;
 *   3. neither has evidence → it speaks (grey teaches; a rating never decides).
 * A level answers only with at least MIN_SLIPS recorded slips behind it.
 *
 * Measured on David's 80 analysed games: opening 28 big vs 45 small (speaks),
 * middlegame 198 vs 177 and endgame 60 vs 59 (quiet) — his own read of his
 * game. Mistakes and blunders always speak; the record still KEEPS every
 * inaccuracy — quiet is a voice decision, never a recording one.
 */
import type { MisconceptionTagRecord } from '../types';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/** Below this many recorded slips a level has nothing to say. */
export const MIN_SLIPS = 6;

export interface Tally { small: number; big: number }
export interface InaccuracyRecord {
  phase: Record<GamePhase, Tally>;
  /** Keyed `${phase}|${tag}`. */
  skill: Map<string, Tally>;
}

const empty = (): Tally => ({ small: 0, big: 0 });
const answers = (t: Tally | undefined): boolean => !!t && t.small + t.big >= MIN_SLIPS;
const speaksOn = (t: Tally): boolean => t.big < t.small;

export function tallyInaccuracies(
  rows: ReadonlyArray<Pick<MisconceptionTagRecord, 'grade' | 'gamePhase' | 'tag'>>,
): InaccuracyRecord {
  const out: InaccuracyRecord = { phase: { opening: empty(), middlegame: empty(), endgame: empty() }, skill: new Map() };
  for (const r of rows) {
    if (!r.gamePhase) continue;
    const small = r.grade === 'inaccuracy'; // a legacy row (no grade) was a mistake or worse
    const bump = (t: Tally): void => { if (small) t.small += 1; else t.big += 1; };
    bump(out.phase[r.gamePhase]);
    if (r.tag && r.tag !== 'other') {
      const key = `${r.gamePhase}|${r.tag}`;
      const t = out.skill.get(key) ?? empty();
      bump(t);
      out.skill.set(key, t);
    }
  }
  return out;
}

export interface InaccuracyVerdict { speaks: boolean; level: 'skill' | 'phase' | 'grey' }

/** Whether an inaccuracy in `phase`, filed under `tag`, is spoken. */
export function inaccuracyVerdict(rec: InaccuracyRecord, phase: GamePhase, tag: string | null): InaccuracyVerdict {
  const cell = tag ? rec.skill.get(`${phase}|${tag}`) : undefined;
  if (cell && answers(cell)) return { speaks: speaksOn(cell), level: 'skill' };
  const p = rec.phase[phase];
  if (answers(p)) return { speaks: speaksOn(p), level: 'phase' };
  return { speaks: true, level: 'grey' };
}

let cached: InaccuracyRecord = tallyInaccuracies([]);

/** The verdict from the last record read (everything speaks until it loads). */
export function inaccuracySpeaks(phase: GamePhase, tag: string | null): boolean {
  return inaccuracyVerdict(cached, phase, tag).speaks;
}

/** Read the record and refresh the tally. Safe to call often. */
export async function loadInaccuracyVoice(): Promise<void> {
  try {
    const { db } = await import('../db/schema');
    cached = tallyInaccuracies(await db.misconceptionTags.toArray());
    // One row per read, so an audit can hold the verdict to the record.
    const phases = (Object.keys(cached.phase) as GamePhase[]);
    const summary = phases.map((p) => `${p}=${inaccuracyVerdict(cached, p, null).speaks ? 'speak' : 'quiet'}(${cached.phase[p].big}/${cached.phase[p].small})`).join(' ');
    const quietSkills = [...cached.skill].filter(([, t]) => answers(t) && !speaksOn(t)).map(([k]) => k);
    void import('./appAuditor').then(({ logAppAudit }) => logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'inaccuracyVoice',
      summary,
      details: JSON.stringify({ quietSkills }),
    })).catch(() => undefined);
  } catch { /* keep the last tally */ }
}

