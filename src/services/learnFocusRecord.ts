/**
 * THE LEARN FOCUS RECORD (WO-LEARN-FOCUS-01, `docs/LEARN-FOCUS.md` §11).
 *
 * One row per focus game (`learnFocusResults`, Dexie v45, in the backup): the
 * focus, how it was scaffolded, and what the user found and missed. The next
 * game's pre-game line reads it ("Last game you found two of five").
 *
 * The picker's input is read here from the ONE record the rest of the app
 * reads: the USE capability profile (its hold rate per tag) and the recorded
 * slips of the user's last five games (prompted slips are not a measurement
 * and are left out, exactly as the hold rate leaves them out).
 */
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { getCapabilityProfile, recordLaneEvidence, type CapabilityProfile } from './capabilityEvidence';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import { isGameSlip, type HeatState } from './holdRate';
import { slipWeight } from './misconceptionService';
import { isMisconceptionTagId, type MisconceptionTagId } from '../data/misconceptionTags';
import { FOCUS_POSED_IMPORTANCE, type FocusId, type FocusMode, type FocusSeat } from '../coach/focus/focusCard';
import type { FocusPickInput } from '../coach/focus/focusPicker';
import type { SeatTally } from '../coach/focus/focusRunner';

export interface LearnFocusResultRecord {
  id: string;
  gameId: string;
  focus: FocusId;
  mode: FocusMode;
  /** The focus's hold state when the game began. */
  state: HeatState;
  announced: boolean;
  /** An unannounced focus a taught miss revealed. */
  revealed: boolean;
  tally: Record<FocusSeat, SeatTally>;
  at: number;
}

/** The games the "last few games" fact reads. */
const RECENT_GAMES = 5;

export async function writeLearnFocusResult(r: Omit<LearnFocusResultRecord, 'id'>): Promise<void> {
  try {
    await db.learnFocusResults.put({ ...r, id: `focus-${r.gameId}` });
  } catch { /* a record, never a blocker */ }
}

/** Weighted misses per tag across the user's last few games (by when played). */
export function recentMissesFrom(slips: ReadonlyArray<Parameters<typeof isGameSlip>[0]>): Map<MisconceptionTagId, number> {
  const latest = new Map<string, number>();
  for (const s of slips) {
    if (!s.sourceGameId || !isGameSlip(s) || s.prompted) continue;
    const t = s.playedAt ?? s.createdAt;
    latest.set(s.sourceGameId, Math.max(latest.get(s.sourceGameId) ?? 0, t));
  }
  const games = new Set([...latest.entries()].sort((a, b) => b[1] - a[1]).slice(0, RECENT_GAMES).map(([g]) => g));
  const out = new Map<MisconceptionTagId, number>();
  for (const s of slips) {
    if (!s.sourceGameId || !games.has(s.sourceGameId) || !isGameSlip(s) || s.prompted) continue;
    const tag = s.tag as MisconceptionTagId;
    out.set(tag, (out.get(tag) ?? 0) + slipWeight(s));
  }
  return out;
}

export async function loadFocusPickInput(): Promise<FocusPickInput> {
  const [profile, slips, results] = await Promise.all([
    getCapabilityProfile('use').catch((): CapabilityProfile => new Map()),
    db.misconceptionTags.toArray().catch(() => []),
    db.learnFocusResults.orderBy('at').toArray().catch(() => [] as LearnFocusResultRecord[]),
  ]);
  const holds = new Map([...profile.entries()].map(([tag, e]) => [tag, e.hold] as const));
  const last = results.length > 0 ? results[results.length - 1] : null;
  const lastTaught: Partial<Record<FocusId, number>> = {};
  for (const r of results) lastTaught[r.focus] = Math.max(lastTaught[r.focus] ?? 0, r.at);
  const chances = (r: LearnFocusResultRecord): number => r.tally.defend.found + r.tally.defend.missed + r.tally.exploit.found + r.tally.exploit.missed;
  return {
    holds,
    recentMisses: recentMissesFrom(slips),
    last: last ? { focus: last.focus, found: last.tally.defend.found + last.tally.exploit.found, chances: chances(last) } : null,
    lastTaught,
  };
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
