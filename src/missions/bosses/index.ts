/**
 * THE BOSSES — one per tier, keyed by `BossId` so a new boss fails to compile
 * until it has a preset (docs/CAMPAIGN.md §7).
 */
import type { BossAttemptRecord, BossId, MissionCard, PatternId } from '../missionCard';
import type { WeaknessTarget } from '../weakness';
import { MISSIONS, PHASE_ORDER, progressOf, type MissionRecordRow } from '../registry';
import { GRABBER } from './grabber';
import { ATTACKER } from './attacker';
import { DYNAMO } from './dynamo';
import { GRINDER } from './grinder';
import { MIRROR } from './mirror';
import type { BossPreset } from './preset';

export type { BossOpening, BossPreset } from './preset';

export const BOSSES: Record<BossId, BossPreset> = {
  grabber: GRABBER,
  attacker: ATTACKER,
  dynamo: DYNAMO,
  grinder: GRINDER,
  mirror: MIRROR,
};

export function isBossId(id: string | null): id is BossId {
  return id !== null && Object.prototype.hasOwnProperty.call(BOSSES, id);
}

/** The cards a boss's levels teach, in registry order. */
export function bossCards(preset: BossPreset, source: Readonly<Record<string, MissionCard>> = MISSIONS): MissionCard[] {
  return Object.values(source).filter((c) => preset.levels.includes(c.level));
}

/** The cards a boss may go after: every habit taught AT OR BELOW its highest
 *  level (docs/CAMPAIGN.md §7, `weakness.ts`) — never one the Campaign has not
 *  taught yet. For a chapter of cards this includes its own; for a silent
 *  chapter (the advanced track) it is everything taught before it, which is
 *  the only record it has. */
export function bossTargetCards(preset: BossPreset, source: Readonly<Record<string, MissionCard>> = MISSIONS): MissionCard[] {
  const top = Math.max(...preset.levels);
  return Object.values(source).filter((c) => c.level <= top);
}

/** Has `bossId` been beaten — a won attempt on the record? */
function beaten(bossId: BossId, attempts: readonly Pick<BossAttemptRecord, 'bossId' | 'result'>[]): boolean {
  return attempts.some((a) => a.bossId === bossId && a.result === 'win');
}

/** Is the boss open? Its preset's `opens` decides:
 *  - `missions`: every mission of its levels — opening, middlegame and endgame
 *    of each — exists and has graduated once. An unbuilt slot keeps it locked.
 *  - `after-boss`: a chapter of silent games has nothing to graduate, so it
 *    opens when the boss before it has been beaten (`attempts`); the track's
 *    first (`after: null`) is open from the start.
 *  `attempts` are the boss records; without them no `after-boss` boss but the
 *  first can open (the safe way round — never a boss opened on a record
 *  nobody read). */
export function bossUnlocked(
  preset: BossPreset,
  record: readonly MissionRecordRow[],
  /** The boss games played — REQUIRED: a gate that opens on a beaten boss
   *  cannot be asked without them (an omitted list kept every advanced boss
   *  after the first locked forever). */
  attempts: readonly Pick<BossAttemptRecord, 'bossId' | 'result'>[],
  source: Readonly<Record<string, MissionCard>> = MISSIONS,
): boolean {
  if (preset.opens.kind === 'after-boss') return preset.opens.after === null || beaten(preset.opens.after, attempts);
  const progress = progressOf(record);
  const cards = bossCards(preset, source);
  return preset.levels.every((level) => PHASE_ORDER.every((phase) => {
    const card = cards.find((c) => c.level === level && c.phase === phase);
    return !!card && progress(card).everGraduated;
  }));
}

/** The intro said before the game: the hunt is promised only when the boss
 *  can actually make it — the record gave it a weak spot (grey is not weak)
 *  AND that habit has a pattern its `targets` scorer can steer at. A weak
 *  habit with no steerable pattern (Develop & Castle; the free piece, which
 *  is never steered at) is watched and revealed in the recap, but nothing in
 *  the boss's play goes after it, so the intro does not say it will. */
export function bossIntroFor(preset: BossPreset, targets: readonly WeaknessTarget[]): string {
  return bossTargetPatterns(targets).length > 0 ? preset.intro : preset.introNoTargets;
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
