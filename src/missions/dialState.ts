/**
 * AUTO-DIALS — the coach turns a card's dials one step at a time from the
 * student's own record (WO-CAMPAIGN-MASTER, Lane B). PURE: the card, its dial
 * state and its active rows in; the next state and the one step taken (or none)
 * out.
 *
 *   the graduation bar met at the current setting, below the card's
 *   graduation level                     → ONE dial one step harder
 *   first-try rate < 75% over the games played at the current setting
 *   (at least 5)                         → the last-moved dial one step back
 *   otherwise                            → nothing
 *
 * 🔄 2026-10-21 (David: "both options are good"). The step up used to wait for
 * a first-try rate above 90% over 5–10 games — but the card graduated at 3 of 5
 * and went silent first, so the coach almost never got harder. The step up now
 * fires on the same bar that graduates a card, and a card graduates only at its
 * graduation level (`ladder.ts`), so meeting the bar at the card's own setting
 * steps the coach up and meeting it again there graduates the card.
 *
 * Never two dials at once. The ladder is data (`ladder.ts`).
 */
import type { CoachDials, DialStateRecord, MissionCard, MissionResultRecord } from './missionCard';
import { dialLevel, graduationBar, graduationLevel, ladderOf, type DialRung } from './ladder';

export const STEP_BACK_BELOW = 0.75;
/** Games at a setting before a falling rate may turn it back. */
export const MIN_GAMES_BEFORE_BACK = 5;
/** The window the step reads: the last games played at the current setting. */
export const SETTING_WINDOW = 5;

type DialKey = keyof CoachDials;

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
  // Only the games played at the CURRENT setting judge it: the games before a
  // step were played against a different coach.
  const atSetting = cur.movedAt === null ? active : active.filter((r) => r.at > (cur.movedAt ?? 0));
  const window = atSetting.slice(-SETTING_WINDOW);
  const firstTry = window.filter((r) => r.outcome === 'pass-first-try').length;
  const rate = window.length > 0 ? firstTry / window.length : 0;
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
  if (firstTry >= graduationBar(card) && dialLevel(card, dials) < graduationLevel(card)) {
    for (const rung of ladderOf(card)) {
      const r = move(rung, 1, 'up');
      if (r.step) return r;
    }
    return { state: cur, step: null };
  }
  if (atSetting.length >= MIN_GAMES_BEFORE_BACK && rate < STEP_BACK_BELOW && cur.lastMoved) {
    const rung = ladderOf(card).find((g) => g.dial === cur.lastMoved);
    return rung ? move(rung, -1, 'back') : { state: cur, step: null };
  }
  return { state: cur, step: null };
}
