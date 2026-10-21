/**
 * THE LADDER — how hard the coach plays a card, and how hard it must be playing
 * when the card graduates (David 2026-10-21, on "the dials step up only above
 * 90% but a card graduates at 3 of 5": "both options are good" — the coach
 * steps up BEFORE a card graduates, and a card graduates only once it has been
 * passed at the harder setting).
 *
 * PURE and shared: `dialState` turns the dials, `progression` decides
 * graduation, and both read the same three numbers from here, so the step-up and
 * the graduation can never disagree about where a card stands.
 *
 *   graduationBar    first-try passes in 5 games (3; 4 from Level 19)
 *   dialLevel        how many ladder steps the dials stand above the card's own
 *   graduationLevel  the steps above its own a card must be passed at to
 *                    graduate — STEPS_BEFORE_GRADUATION, capped by the room the
 *                    ladder has above the card's own dials
 *
 * The ladder is DATA, easiest value first. It holds the coach's strength until
 * the per-tier dial tables (docs/CAMPAIGN.md §6, TO FILL) replace it.
 */
import type { CoachDials, MissionCard } from './missionCard';

type DialKey = keyof CoachDials;

export interface DialRung {
  dial: DialKey;
  /** The dial's values, easiest first. */
  values: readonly CoachDials[DialKey][];
}

/** The dials the loop may turn, in the order it turns them up. */
export const DIAL_LADDER: readonly DialRung[] = [
  { dial: 'strengthOffset', values: [-300, -200, -100, 0, 100, 200, 300] },
];

/** Steps above its own dials a card is passed at before it graduates — until
 *  the per-tier tables say otherwise. One: pass the habit at your level, the
 *  coach plays a notch harder, pass it again there, and it is yours. */
export const STEPS_BEFORE_GRADUATION = 1;

/** The first-try passes a card needs in its window. Level 19 and up ask 4. */
export function graduationBar(card: Pick<MissionCard, 'level' | 'graduate'>): number {
  return Math.max(card.graduate.firstTryPasses, card.level >= 19 ? 4 : 0);
}

/** How many ladder steps `dials` stand above the card's own (negative when the
 *  loop has stepped below them). A value off the ladder is the card's own
 *  choice and counts as no step. */
export function dialLevel(card: Pick<MissionCard, 'coachDials'>, dials: CoachDials): number {
  let level = 0;
  for (const rung of DIAL_LADDER) {
    const own = rung.values.indexOf(card.coachDials[rung.dial]);
    const now = rung.values.indexOf(dials[rung.dial]);
    if (own >= 0 && now >= 0) level += now - own;
  }
  return level;
}

/** The level a card must be passed at to graduate: STEPS_BEFORE_GRADUATION,
 *  or less when the ladder has no more room above the card's own dials. */
export function graduationLevel(card: Pick<MissionCard, 'coachDials'>): number {
  let room = 0;
  for (const rung of DIAL_LADDER) {
    const own = rung.values.indexOf(card.coachDials[rung.dial]);
    if (own >= 0) room += rung.values.length - 1 - own;
  }
  return Math.min(STEPS_BEFORE_GRADUATION, room);
}
