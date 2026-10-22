/**
 * THE DYNAMO — Tier 12, imbalances (Levels 41–44, a chapter of silent games;
 * docs/CAMPAIGN.md §7, §9). It trades a bishop for a knight or a knight for a
 * bishop whenever the trade is even, and avoids even like-for-like swaps
 * (`imbalance`), so the position never stays level and the student has to
 * play the balance the trade left. And it goes after the student's weakest
 * taught habits (`targets`). Plays at the student's own strength.
 */
import { LEVEL_1_DIALS } from '../registry';
import type { BossPreset } from './preset';

declare module '../missionCard' {
  interface BossIdMap {
    /** Tier 12: unbalances the position. */
    dynamo: true;
  }
}

export const DYNAMO: BossPreset = {
  id: 'dynamo',
  tier: 12,
  name: 'The Dynamo',
  intro: 'The Dynamo trades bishops for knights and knights for bishops, and it avoids even swaps, so no position stays level. It has studied your games and will go after your weak spots. After every trade, ask whether the new position suits your pieces or its pieces.',
  introNoTargets: 'The Dynamo trades bishops for knights and knights for bishops, and it avoids even swaps, so no position stays level. After every trade, ask whether the new position suits your pieces or its pieces.',
  levels: [41, 42, 43, 44],
  opens: { kind: 'after-boss', after: 'attacker' },
  dials: { ...LEVEL_1_DIALS, rewinds: 'none' },
  weights: { imbalance: 1, targets: 1 },
};
