/**
 * THE MIRROR — Tier 14, the last boss (Levels 49–50, a chapter of silent
 * games; docs/CAMPAIGN.md §7: "built from the student's own record, steering
 * at their three biggest weaknesses, rating +150").
 *
 * It has no personality of its own: its ONLY scorer is `targets`, steering at
 * the student's weakest habits — every card taught at or below Level 50, up
 * to `MAX_TARGETS` (3), ranked by the record (`weakness.rankWeaknesses`:
 * mission misses plus the card's skill-meter deficit). And it plays 150
 * points above the student (`strengthOffset`). A record with no weakness on it
 * gives it nothing to steer at: it says so (`introNoTargets`) and plays as a
 * slightly stronger student — never a made-up hunt.
 */
import { LEVEL_1_DIALS } from '../registry';
import type { BossPreset } from './preset';

declare module '../missionCard' {
  interface BossIdMap {
    /** Tier 14: the student's own record, played back at them. */
    mirror: true;
  }
}

/** Rating points the Mirror plays above the student (docs/CAMPAIGN.md §7). */
export const MIRROR_STRENGTH = 150;

export const MIRROR: BossPreset = {
  id: 'mirror',
  tier: 14,
  name: 'The Mirror',
  intro: 'The Mirror is built from your own games. It plays a little stronger than you, and it goes straight at your weak spots. Show it they are not weak any more.',
  introNoTargets: 'The Mirror is built from your own games, and your record shows no weak spot for it to use yet. It plays a little stronger than you. Beat it as you are.',
  levels: [49, 50],
  opens: { kind: 'after-boss', after: 'grinder' },
  dials: { ...LEVEL_1_DIALS, rewinds: 'none', strengthOffset: MIRROR_STRENGTH },
  weights: { targets: 1 },
};
