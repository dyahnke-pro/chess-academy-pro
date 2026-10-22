/**
 * THE GRINDER — Tier 13, squeeze & resilience (Levels 45–48, a chapter of
 * silent games; docs/CAMPAIGN.md §7, §9). A pawn or more up, it trades pieces
 * evenly (`simplify`); behind, it refuses even trades and keeps the pieces on
 * (`trades` at a negative weight). So the student who falls behind gets
 * squeezed, and the student who gets ahead has to convert against a defender
 * who will not simplify. And it goes after the student's weakest taught
 * habits (`targets`). Plays at the student's own strength.
 */
import { LEVEL_1_DIALS } from '../registry';
import type { BossPreset } from './preset';

declare module '../missionCard' {
  interface BossIdMap {
    /** Tier 13: trades down ahead, holds on behind. */
    grinder: true;
  }
}

export const GRINDER: BossPreset = {
  id: 'grinder',
  tier: 13,
  name: 'The Grinder',
  intro: 'The Grinder trades pieces the moment it gets ahead, and keeps them on when it is behind. It has studied your games and will go after your weak spots. Do not fall behind early, and when you get ahead, trade pieces yourself.',
  introNoTargets: 'The Grinder trades pieces the moment it gets ahead, and keeps them on when it is behind. Do not fall behind early, and when you get ahead, trade pieces yourself.',
  levels: [45, 46, 47, 48],
  opens: { kind: 'after-boss', after: 'dynamo' },
  dials: { ...LEVEL_1_DIALS, rewinds: 'none' },
  weights: { simplify: 1, trades: -1, targets: 1 },
};
