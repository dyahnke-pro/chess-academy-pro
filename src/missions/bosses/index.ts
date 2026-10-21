/**
 * THE BOSSES — one per tier, keyed by `BossId` so a new boss fails to compile
 * until it has a preset (docs/CAMPAIGN.md §7).
 */
import type { BossId, MissionCard, PatternId } from '../missionCard';
import type { WeaknessTarget } from '../weakness';
import { MISSIONS, PHASE_ORDER, progressOf, type MissionRecordRow } from '../registry';
import { GRABBER } from './grabber';
import type { BossPreset } from './preset';

export type { BossPreset } from './preset';

export const BOSSES: Record<BossId, BossPreset> = {
  grabber: GRABBER,
};

export function isBossId(id: string | null): id is BossId {
  return id !== null && Object.prototype.hasOwnProperty.call(BOSSES, id);
}

/** The cards a boss's levels teach, in registry order. */
export function bossCards(preset: BossPreset, source: Readonly<Record<string, MissionCard>> = MISSIONS): MissionCard[] {
  return Object.values(source).filter((c) => preset.levels.includes(c.level));
}

/** Open when every mission of its levels — opening, middlegame and endgame of
 *  each — exists and has graduated once. An unbuilt slot keeps it locked. */
export function bossUnlocked(
  preset: BossPreset,
  record: readonly MissionRecordRow[],
  source: Readonly<Record<string, MissionCard>> = MISSIONS,
): boolean {
  const progress = progressOf(record);
  const cards = bossCards(preset, source);
  return preset.levels.every((level) => PHASE_ORDER.every((phase) => {
    const card = cards.find((c) => c.level === level && c.phase === phase);
    return !!card && progress(card).everGraduated;
  }));
}

/** Patterns a boss never steers toward. Inside the coach's window a "free
 *  piece" is a sacrifice that pays later — the pure check cannot see the
 *  payback (mined from 5,721 games, Lane D) — so steering at it would set the
 *  student a poisoned piece. That habit is tested by the plant instead. */
const NOT_STEERABLE: ReadonlySet<PatternId> = new Set<PatternId>(['free-piece']);

/** The patterns of a boss's targets, distinct, weakest first — what its
 *  `targets` scorer steers toward. A target whose card has no steerable
 *  pattern adds none. */
export function bossTargetPatterns(targets: readonly WeaknessTarget[]): PatternId[] {
  return [...new Set(targets.flatMap((t) => (t.pattern && !NOT_STEERABLE.has(t.pattern) ? [t.pattern] : [])))];
}
