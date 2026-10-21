/**
 * WATCHERS — a graduated habit keeps running, silently (WO-CAMPAIGN-MASTER,
 * Lane B). Every game, each graduated card of a phase reads the board without
 * a word and writes one row (`watcher: true`); 2 misses in its last 5 watched
 * games bring it back as the phase's mission (`progression.ts`).
 */
import type { MissionCard, MissionPhase } from './missionCard';
import { MISSIONS, inTeachingOrder, progressOf, type MissionRecordRow } from './registry';

/** The phase's graduated cards — they run as silent watchers next game. */
export function watchersForPhase(
  phase: MissionPhase,
  record: readonly MissionRecordRow[],
  source: Readonly<Record<string, MissionCard>> = MISSIONS,
): MissionCard[] {
  const progress = progressOf(record);
  return inTeachingOrder(phase, source).filter((c) => progress(c).status === 'graduated');
}
