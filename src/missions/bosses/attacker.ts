/**
 * THE ATTACKER — Tier 11, calculation (Levels 37–40, a chapter of silent games;
 * docs/CAMPAIGN.md §7, §9). It brings its pieces to bear around the student's
 * king (`kingPressure`), so every move asks the student to calculate the
 * checks and captures coming at them. And it goes after the student's weakest
 * taught habits (`targets`). Plays at the student's own strength.
 */
import { LEVEL_1_DIALS } from '../registry';
import type { BossPreset } from './preset';

declare module '../missionCard' {
  interface BossIdMap {
    /** Tier 11: comes for the king. */
    attacker: true;
  }
}

export const ATTACKER: BossPreset = {
  id: 'attacker',
  tier: 11,
  name: 'The Attacker',
  intro: 'The Attacker comes straight for your king, and it has studied your games: it will go after your weak spots. Keep your king covered, and before each move look at every check and capture it could play.',
  introNoTargets: 'The Attacker comes straight for your king. Keep your king covered, and before each move look at every check and capture it could play.',
  levels: [37, 38, 39, 40],
  // The advanced track's first boss: open from the start of the track.
  opens: { kind: 'after-boss', after: null },
  dials: { ...LEVEL_1_DIALS, rewinds: 'none' },
  weights: { kingPressure: 1, targets: 1 },
};
