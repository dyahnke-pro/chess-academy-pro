/**
 * THE LEARN FOCUS RECORD (WO-LEARN-FOCUS-01 → WO-FOCUS-TACTICS-01,
 * `docs/LEARN-FOCUS.md` §11).
 *
 * One row per focus game (`learnFocusResults`, Dexie v45, in the backup): the
 * rung it was played at, what the user found and missed, and the unprompted
 * answers at the rung — the rows the next game's rung is read from
 * (`focusRung`).
 *
 * The setup's input is read here from the ONE record the rest of the app
 * reads: the USE capability profile (its hold rate per tag — the open motif
 * levels, and a first game's seed rung) and the rung rows.
 */
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { getCapabilityProfile, recordLaneEvidence, type CapabilityProfile } from './capabilityEvidence';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import type { HeatState } from './holdRate';
import { isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';
import { FOCUS_POSED_IMPORTANCE, type FocusId, type FocusSeat, type LegacyFocusId } from '../coach/focus/focusCard';
import type { FocusSetupInput } from '../coach/focus/focusSetup';
import type { SeatTally } from '../coach/focus/focusRunner';
import type { ChanceDifficulty } from '../coach/focus/focusChances';
import type { RungGame, TacticsRung } from '../coach/focus/focusRung';

export interface LearnFocusResultRecord {
  id: string;
  gameId: string;
  /** 'tactics'; a row an older build wrote may hold one of the three
   *  lessons it had (BRIDGED: read, never written). */
  focus: FocusId | LegacyFocusId;
  /** The rung the game was played at; absent on rows older than
   *  WO-FOCUS-TACTICS-01, which the rung never reads. */
  rung?: TacticsRung;
  /** Unprompted answers to chances at least as hard as the rung (either
   *  seat) — what moves the rung. */
  atRung?: { found: number; missed: number };
  tally: Record<FocusSeat, SeatTally>;
  /** The first chance on your side at your rung (`focusPlant`'s guarantee),
   *  null when the game ended without one. */
  presented?: { ply: number; difficulty: ChanceDifficulty } | null;
  /** The longest tempo run of the game (`tempoRun`); absent on older rows. */
  tempoRun?: number;
  at: number;
  /** Rows older than WO-FOCUS-TACTICS-01 carried how the game was scaffolded. */
  mode?: string;
  state?: HeatState;
  announced?: boolean;
  revealed?: boolean;
  step?: ChanceDifficulty;
}

export async function writeLearnFocusResult(r: Omit<LearnFocusResultRecord, 'id'>): Promise<void> {
  try {
    await db.learnFocusResults.put({ ...r, id: `focus-${r.gameId}` });
  } catch { /* a record, never a blocker */ }
}

/** The longest tempo run on the record (0 with none). */
export function tempoBestOf(rows: readonly LearnFocusResultRecord[]): number {
  return rows.reduce((best, r) => Math.max(best, r.tempoRun ?? 0), 0);
}

/** The rung rows: every focus game played at a rung (older rows have none). */
export function rungGamesFrom(rows: readonly LearnFocusResultRecord[]): RungGame[] {
  return rows.flatMap((r) => (typeof r.rung === 'number' && r.atRung ? [{ rung: r.rung, found: r.atRung.found, missed: r.atRung.missed, at: r.at }] : []));
}

export async function loadFocusSetupInput(): Promise<Omit<FocusSetupInput, 'rand'>> {
  const [profile, results] = await Promise.all([
    getCapabilityProfile('use').catch((): CapabilityProfile => new Map()),
    db.learnFocusResults.orderBy('at').toArray().catch(() => [] as LearnFocusResultRecord[]),
  ]);
  const holds = new Map([...profile.entries()].map(([tag, e]) => [tag, e.hold] as const));
  return { holds, games: rungGamesFrom(results), tempoBest: tempoBestOf(results) };
}

/** A focus chance answered, on the record (one writer, the lane-evidence
 *  door, so one move poses a skill once). */
export function recordFocusAnswer(r: {
  tag: MisconceptionTagId; outcome: 'held' | 'broken'; fen: string; san: string;
  prompted: boolean; steered: boolean; takenBack: boolean; gameId: string | null;
}): void {
  void recordLaneEvidence({
    lane: 'focus', tag: r.tag, outcome: r.outcome, fen: r.fen, playedSan: r.san,
    posedImportance: FOCUS_POSED_IMPORTANCE, origin: 'learn', prompted: r.prompted, steered: r.steered,
    takenBack: r.takenBack, ...(r.gameId ? { sourceGameId: r.gameId } : {}),
  });
}

/** The deciding blunder was taken back, so the game record never holds it:
 *  filed here, unprompted, under the skill the record's own classifier names. */
export function recordDecidingMiss(r: { fen: string; san: string; bestUci: string | null; gameId: string | null }): void {
  try {
    let bestSan: string | undefined;
    if (r.bestUci) {
      try { bestSan = new Chess(r.fen).move({ from: r.bestUci.slice(0, 2), to: r.bestUci.slice(2, 4), promotion: r.bestUci[4] }).san; } catch { bestSan = undefined; }
    }
    const tag = classifyMisconceptionNow({ fen: r.fen, playedSan: r.san, ...(bestSan ? { bestSan } : {}) })?.tag;
    if (!tag || !isMisconceptionTagId(tag) || tag === 'other') return;
    recordFocusAnswer({ tag, outcome: 'broken', fen: r.fen, san: r.san, prompted: false, steered: false, takenBack: true, gameId: r.gameId });
  } catch { /* a record, never a blocker */ }
}
