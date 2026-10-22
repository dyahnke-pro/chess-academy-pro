/**
 * THE GRABBER — Tier 1 (WO-CAMPAIGN-MASTER, Lane E). It takes every pawn it
 * can, leaves its own pieces loose, and never makes luft for its king — so
 * the student who develops, castles and takes what is left loose beats it.
 * And it goes after the student's weakest Level 1–4 habits (`targets`).
 */
import { LEVEL_1_DIALS } from '../registry';
import type { BossPreset } from './preset';

export const GRABBER: BossPreset = {
  id: 'grabber',
  tier: 1,
  name: 'The Grabber',
  intro: "The Grabber takes everything you leave lying around, and it's studied your games: it will go after your weak spots. Develop, castle, and take what it leaves loose.",
  // The same words without the hunt: a fresh record names no weak spot.
  introNoTargets: 'The Grabber takes everything you leave lying around. Develop, castle, and take what it leaves loose.',
  levels: [1, 2, 3, 4],
  opens: { kind: 'missions' },
  dials: { ...LEVEL_1_DIALS, rewinds: 'none' },
  weights: { greed: 1, loose: 0.5, luft: -1, targets: 1 },
};
