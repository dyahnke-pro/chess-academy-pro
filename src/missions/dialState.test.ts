import { describe, expect, it } from 'vitest';
import { effectiveDials, nextDialState } from './dialState';
import { DIAL_LADDER } from './ladder';
import { MISSIONS } from './registry';
import type { DialStateRecord, MissionOutcome } from './missionCard';

const CARD = MISSIONS['develop-and-castle'];
const rows = (outcomes: MissionOutcome[], from = 0): Array<{ outcome: MissionOutcome; at: number }> =>
  outcomes.map((outcome, i) => ({ outcome, at: from + i + 1 }));
const P: MissionOutcome = 'pass-first-try';
const R: MissionOutcome = 'pass-retry';
const I: MissionOutcome = 'incomplete';
const stepped = (strengthOffset: number, movedAt: number | null): DialStateRecord => ({
  missionId: CARD.id, dials: { ...CARD.coachDials, strengthOffset }, lastMoved: 'strengthOffset', movedAt, updatedAt: movedAt ?? 0,
});

describe('auto-dials — the coach steps up on the bar that graduates a card (2026-10-21)', () => {
  it('two first-try passes are not the bar: nothing moves', () => {
    expect(nextDialState(CARD, null, rows([P, I, P]), 100).step).toBeNull();
  });

  it('three first-try passes at the card\'s own setting turn ONE dial one step harder', () => {
    const { state, step } = nextDialState(CARD, null, rows([P, I, P, P]), 100);
    expect(step).toMatchObject({ dial: 'strengthOffset', from: 0, to: 100, direction: 'up', games: 4 });
    expect(state).toMatchObject({ lastMoved: 'strengthOffset', movedAt: 100 });
    const changed = (Object.keys(CARD.coachDials) as Array<keyof typeof CARD.coachDials>).filter((k) => state.dials[k] !== CARD.coachDials[k]);
    expect(changed).toEqual(['strengthOffset']);
  });

  it('retries never count toward the bar', () => {
    expect(nextDialState(CARD, null, rows([R, R, R, R, R]), 100).step).toBeNull();
  });

  it('at the graduation level the bar graduates the card instead — the coach gets no harder', () => {
    // One step above its own dials is the graduation level (ladder.ts).
    expect(nextDialState(CARD, stepped(100, 5), rows([P, P, P, P, P], 10), 200).step).toBeNull();
  });

  it('only games at the CURRENT setting count — passes before the step do not carry over', () => {
    // Stepped back to the card's own setting at 5: the three passes before it
    // were played against another coach, so no step up yet.
    const back: DialStateRecord = { ...stepped(0, 5), lastMoved: 'strengthOffset' };
    expect(nextDialState(CARD, back, [...rows([P, P, P]), ...rows([P, I], 10)], 200).step).toBeNull();
    expect(nextDialState(CARD, back, [...rows([P, P, P]), ...rows([P, I, P, P], 10)], 200).step).toMatchObject({ to: 100, direction: 'up' });
  });

  it('below 75% over 5 games at the setting turns the LAST-MOVED dial back — never one that was not moved', () => {
    const back = nextDialState(CARD, stepped(100, 5), rows([I, I, I, P, I], 10), 200);
    expect(back.step).toMatchObject({ dial: 'strengthOffset', from: 100, to: 0, direction: 'back' });
    expect(nextDialState(CARD, null, rows([I, I, I, I, I]), 200).step).toBeNull();
  });

  it('a falling rate waits for 5 games at the setting', () => {
    expect(nextDialState(CARD, stepped(100, 5), rows([I, I, I, I], 10), 200).step).toBeNull();
  });

  it('watched games never count — a dial is about the active habit', () => {
    const watched = rows([P, P, P, P, P]).map((r) => ({ ...r, watcher: true }));
    expect(nextDialState(CARD, null, watched, 100).step).toBeNull();
  });

  it('a card at the top of the ladder has no graduation level to climb to', () => {
    const rung = DIAL_LADDER[0];
    const top = rung.values[rung.values.length - 1] as number;
    const atTop = { ...CARD, coachDials: { ...CARD.coachDials, strengthOffset: top } };
    expect(nextDialState(atTop, null, rows([P, P, P, P, P]), 100).step).toBeNull();
  });

  it("the card's own dials stand until the loop moves one", () => {
    expect(effectiveDials(CARD, null)).toEqual(CARD.coachDials);
    expect(effectiveDials(CARD, stepped(200, 1)).strengthOffset).toBe(200);
  });
});
