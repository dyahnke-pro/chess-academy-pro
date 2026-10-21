/**
 * AUTO-DIALS — the coach turns its own dials toward an 85% first-try rate
 * (WO-CAMPAIGN-MASTER, Lane B). PURE: the card, its dial state and its active
 * rows in; the next state and the one step taken (or none) out.
 *
 *   rate > 90% over its last 5–10 active games → ONE dial one step harder
 *   rate < 75%                                  → the last-moved dial one step back
 *   in between                                  → nothing (hysteresis)
 *   fewer than 5 active games since the last step → nothing
 *
 * Never two dials at once. The ladder is DATA (`DIAL_LADDER`, easiest value
 * first) so the per-tier tables in docs/CAMPAIGN.md §6 drop in without code.
 * Until David sets them it holds one dial: the coach's strength.
 */
import type { CoachDials, DialStateRecord, MissionCard, MissionResultRecord } from './missionCard';

export const STEP_UP_ABOVE = 0.9;
export const STEP_BACK_BELOW = 0.75;
export const MIN_GAMES_BETWEEN_STEPS = 5;
export const RATE_WINDOW_MAX = 10;

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

export interface DialStep {
  dial: DialKey;
  from: CoachDials[DialKey];
  to: CoachDials[DialKey];
  direction: 'up' | 'back';
  rate: number;
  games: number;
}

type Row = Pick<MissionResultRecord, 'outcome' | 'at'> & { watcher?: boolean };

/** The dials a card plays under: its own, or the loop's when it has moved them. */
export function effectiveDials(card: MissionCard, state: DialStateRecord | null): CoachDials {
  return state ? { ...card.coachDials, ...state.dials } : card.coachDials;
}

/** One step along the rung, or null at its end. A value that is not on the
 *  ladder is the card's own choice and the loop leaves it alone. */
function shift(rung: DialRung, current: CoachDials[DialKey], by: 1 | -1): CoachDials[DialKey] | null {
  const i = rung.values.indexOf(current);
  const to = i + by;
  return i >= 0 && to >= 0 && to < rung.values.length ? rung.values[to] : null;
}

export function nextDialState(
  card: MissionCard,
  state: DialStateRecord | null,
  rows: readonly Row[],
  now: number,
): { state: DialStateRecord; step: DialStep | null } {
  const active = rows.filter((r) => !r.watcher).sort((a, b) => a.at - b.at);
  const cur: DialStateRecord = state ?? { missionId: card.id, dials: card.coachDials, lastMoved: null, movedAt: null, updatedAt: now };
  const window = active.slice(-RATE_WINDOW_MAX);
  const since = cur.movedAt === null ? active.length : active.filter((r) => r.at > (cur.movedAt ?? 0)).length;
  if (window.length < MIN_GAMES_BETWEEN_STEPS || since < MIN_GAMES_BETWEEN_STEPS) return { state: cur, step: null };
  const rate = window.filter((r) => r.outcome === 'pass-first-try').length / window.length;
  const dials = effectiveDials(card, cur);
  const move = (rung: DialRung, by: 1 | -1, direction: 'up' | 'back'): { state: DialStateRecord; step: DialStep | null } => {
    const from = dials[rung.dial];
    const to = shift(rung, from, by);
    if (to === null) return { state: cur, step: null };
    return {
      state: { ...cur, dials: { ...dials, [rung.dial]: to } as CoachDials, lastMoved: rung.dial, movedAt: now, updatedAt: now },
      step: { dial: rung.dial, from, to, direction, rate, games: window.length },
    };
  };
  if (rate > STEP_UP_ABOVE) {
    for (const rung of DIAL_LADDER) {
      const r = move(rung, 1, 'up');
      if (r.step) return r;
    }
    return { state: cur, step: null };
  }
  if (rate < STEP_BACK_BELOW && cur.lastMoved) {
    const rung = DIAL_LADDER.find((g) => g.dial === cur.lastMoved);
    return rung ? move(rung, -1, 'back') : { state: cur, step: null };
  }
  return { state: cur, step: null };
}
