import { describe, expect, it } from 'vitest';
import { DIAL_LADDER, effectiveDials, nextDialState } from './dialState';
import { MISSIONS } from './registry';
import type { DialStateRecord, MissionOutcome } from './missionCard';

const CARD = MISSIONS['develop-and-castle'];
const rows = (outcomes: MissionOutcome[], from = 0): Array<{ outcome: MissionOutcome; at: number }> =>
  outcomes.map((outcome, i) => ({ outcome, at: from + i + 1 }));
const P: MissionOutcome = 'pass-first-try';
const I: MissionOutcome = 'incomplete';

describe('auto-dials', () => {
  it('nothing moves before 5 active games', () => {
    expect(nextDialState(CARD, null, rows([P, P, P, P]), 100).step).toBeNull();
  });

  it('above 90% turns ONE dial one step harder — the first rung of the ladder', () => {
    const { state, step } = nextDialState(CARD, null, rows([P, P, P, P, P]), 100);
    expect(step).toMatchObject({ dial: 'strengthOffset', from: 0, to: 100, direction: 'up', games: 5 });
    expect(state).toMatchObject({ lastMoved: 'strengthOffset', movedAt: 100 });
    // Only that one dial changed.
    const changed = (Object.keys(CARD.coachDials) as Array<keyof typeof CARD.coachDials>).filter((k) => state.dials[k] !== CARD.coachDials[k]);
    expect(changed).toEqual(['strengthOffset']);
  });

  it('between 75% and 90% nothing moves (hysteresis)', () => {
    // 8 of 10 = 80%.
    expect(nextDialState(CARD, null, rows([P, P, P, P, I, P, P, P, I, P]), 100).step).toBeNull();
  });

  it('below 75% turns the LAST-MOVED dial back — and never one that was not moved', () => {
    const moved: DialStateRecord = { missionId: CARD.id, dials: { ...CARD.coachDials, strengthOffset: 100 }, lastMoved: 'strengthOffset', movedAt: 5, updatedAt: 5 };
    const back = nextDialState(CARD, moved, rows([I, I, I, P, I], 10), 200);
    expect(back.step).toMatchObject({ dial: 'strengthOffset', from: 100, to: 0, direction: 'back' });
    // A card that never moved has nothing to turn back.
    expect(nextDialState(CARD, null, rows([I, I, I, I, I]), 200).step).toBeNull();
  });

  it('a step waits for 5 active games after the last one', () => {
    const moved: DialStateRecord = { missionId: CARD.id, dials: { ...CARD.coachDials, strengthOffset: 100 }, lastMoved: 'strengthOffset', movedAt: 5, updatedAt: 5 };
    // Games at 1..10: only 6..10 are after the move at 5 → exactly 5: may step.
    expect(nextDialState(CARD, moved, rows([P, P, P, P, P, P, P, P, P, P]), 50).step).toMatchObject({ to: 200 });
    // Games 1..9: four since the move → wait.
    expect(nextDialState(CARD, moved, rows([P, P, P, P, P, P, P, P, P]), 50).step).toBeNull();
  });

  it('watched games never count — a dial is about the active habit', () => {
    const watched = rows([P, P, P, P, P]).map((r) => ({ ...r, watcher: true }));
    expect(nextDialState(CARD, null, watched, 100).step).toBeNull();
  });

  it('at the top of the ladder nothing more moves', () => {
    const top = DIAL_LADDER[0].values[DIAL_LADDER[0].values.length - 1];
    const s: DialStateRecord = { missionId: CARD.id, dials: { ...CARD.coachDials, strengthOffset: top as number }, lastMoved: 'strengthOffset', movedAt: null, updatedAt: 0 };
    expect(nextDialState(CARD, s, rows([P, P, P, P, P]), 100).step).toBeNull();
  });

  it("the card's own dials stand until the loop moves one", () => {
    expect(effectiveDials(CARD, null)).toEqual(CARD.coachDials);
    const s: DialStateRecord = { missionId: CARD.id, dials: { ...CARD.coachDials, strengthOffset: 200 }, lastMoved: 'strengthOffset', movedAt: 1, updatedAt: 1 };
    expect(effectiveDials(CARD, s).strengthOffset).toBe(200);
  });
});
