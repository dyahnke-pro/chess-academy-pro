import { describe, expect, it } from 'vitest';
import { effectiveDials, nextDialState } from './dialState';
import { MISSIONS } from './registry';
import type { DialStateRecord, MissionOutcome } from './missionCard';

const CARD = MISSIONS['develop-and-castle'];
const rows = (outcomes: MissionOutcome[], from = 0): Array<{ outcome: MissionOutcome; at: number }> =>
  outcomes.map((outcome, i) => ({ outcome, at: from + i + 1 }));
const P: MissionOutcome = 'pass-first-try';
const R: MissionOutcome = 'pass-retry';
const I: MissionOutcome = 'incomplete';
const poking = (movedAt: number | null): DialStateRecord => ({
  missionId: CARD.id, dials: { ...CARD.coachDials, attacksOnPieces: 'on' }, lastMoved: 'attacksOnPieces', movedAt, updatedAt: movedAt ?? 0,
});

describe('auto-dials — the coach steps up on the bar that graduates a card (2026-10-21)', () => {
  it('two first-try passes after a miss are not the bar: nothing moves', () => {
    expect(nextDialState(CARD, null, rows([P, I, P]), 100).step).toBeNull();
  });

  it('three first-try passes at the card\'s own setting turn ONE dial one step harder — the LESSON, not the coach', () => {
    const { state, step } = nextDialState(CARD, null, rows([P, I, P, P]), 100);
    expect(step).toMatchObject({ dial: 'attacksOnPieces', from: 'off', to: 'on', direction: 'up', games: 4 });
    expect(state).toMatchObject({ lastMoved: 'attacksOnPieces', movedAt: 100 });
    const changed = (Object.keys(CARD.coachDials) as Array<keyof typeof CARD.coachDials>).filter((k) => state.dials[k] !== CARD.coachDials[k]);
    expect(changed).toEqual(['attacksOnPieces']);
  });

  it('retries never count toward the bar', () => {
    expect(nextDialState(CARD, null, rows([R, R, R, R, R]), 100).step).toBeNull();
  });

  it('at the graduation level the bar graduates the card instead — the coach gets no harder', () => {
    expect(nextDialState(CARD, poking(5), rows([P, P, P, P, P], 10), 200).step).toBeNull();
  });

  it('only games at the CURRENT setting count — passes before the step do not carry over', () => {
    const back: DialStateRecord = { ...poking(5), dials: CARD.coachDials };
    expect(nextDialState(CARD, back, [...rows([I, P, P]), ...rows([P, I], 10)], 200).step).toBeNull();
    expect(nextDialState(CARD, back, [...rows([I, P, P]), ...rows([P, I, P, P], 10)], 200).step).toMatchObject({ to: 'on', direction: 'up' });
  });

  it('below 75% over 5 games at the setting turns the LAST-MOVED dial back — never one that was not moved', () => {
    const back = nextDialState(CARD, poking(5), rows([I, I, I, P, I], 10), 200);
    expect(back.step).toMatchObject({ dial: 'attacksOnPieces', from: 'on', to: 'off', direction: 'back' });
    expect(nextDialState(CARD, null, rows([I, I, I, I, I]), 200).step).toBeNull();
  });

  it('a falling rate waits for 5 games at the setting', () => {
    expect(nextDialState(CARD, poking(5), rows([I, I, I, I], 10), 200).step).toBeNull();
  });

  it('watched games never count — a dial is about the active habit', () => {
    const watched = rows([P, P, P, P, P]).map((r) => ({ ...r, watcher: true }));
    expect(nextDialState(CARD, null, watched, 100).step).toBeNull();
  });

  it("the card's own dials stand until the loop moves one", () => {
    expect(effectiveDials(CARD, null)).toEqual(CARD.coachDials);
    expect(effectiveDials(CARD, poking(1)).attacksOnPieces).toBe('on');
  });
});

describe('the coach\'s strength is on no ladder (David 2026-10-21: "coach still plays to match the users level")', () => {
  it('no card climbs the coach\'s strength', () => {
    for (const card of Object.values(MISSIONS)) {
      expect((card.ladder ?? []).map((r) => r.dial)).not.toContain('strengthOffset');
    }
  });

  it('a strength a device saved under the old ladder is never read back', () => {
    // Prod, 2026-10-21: K+Q mate stepped the coach 0 → +100 on the old shared ladder.
    const KQ = MISSIONS['kq-mate'];
    const stale: DialStateRecord = { missionId: KQ.id, dials: { ...KQ.coachDials, strengthOffset: 100 }, lastMoved: 'strengthOffset', movedAt: 5, updatedAt: 5 };
    expect(effectiveDials(KQ, stale).strengthOffset).toBe(KQ.coachDials.strengthOffset);
    const FP = MISSIONS['free-piece-stay-ahead'];
    const old: DialStateRecord = { missionId: FP.id, dials: { ...FP.coachDials, strengthOffset: 200, plantDepth: 2 }, lastMoved: 'strengthOffset', movedAt: 5, updatedAt: 5 };
    expect(effectiveDials(FP, old)).toMatchObject({ strengthOffset: 0, plantDepth: 2 });
  });

  it('a card with no ladder never steps, and a stale last-moved dial steps nothing back', () => {
    const KQ = MISSIONS['kq-mate'];
    expect(nextDialState(KQ, null, rows([P, P, P, P, P]), 100).step).toBeNull();
    const stale: DialStateRecord = { missionId: KQ.id, dials: { ...KQ.coachDials, strengthOffset: 100 }, lastMoved: 'strengthOffset', movedAt: 5, updatedAt: 5 };
    expect(nextDialState(KQ, stale, rows([I, I, I, I, I], 10), 200).step).toBeNull();
  });
});

describe('the fast first climb (2026-10-22) — a student who has the habit is not held at each setting', () => {
  it('a first-try pass on a clean record steps up at once', () => {
    expect(nextDialState(CARD, null, rows([P]), 100).step).toMatchObject({ dial: 'attacksOnPieces', to: 'on', direction: 'up', games: 1 });
  });

  it('one step per game: the same record read again after the step moves nothing', () => {
    expect(nextDialState(CARD, poking(100), rows([P]), 200).step).toBeNull();
  });

  it('the first game that is not a first-try pass ends the climb — the bar decides from then', () => {
    // Fail twin: a retry in the record.
    expect(nextDialState(CARD, null, rows([R, P]), 100).step).toBeNull();
    expect(nextDialState(CARD, null, rows([P, I, P]), 100).step).toBeNull();
  });

  it('the earned piece deepens its shot after one clean first-try pass', () => {
    const FP = MISSIONS['free-piece-stay-ahead'];
    expect(nextDialState(FP, null, rows([P]), 100).step).toMatchObject({ dial: 'plantDepth', from: 1, to: 2 });
  });
});

describe('a card\'s own ladder — the earned piece deepens its shot first (§6a)', () => {
  const FP = MISSIONS['free-piece-stay-ahead'];

  it('three first-try passes deepen the shot to two key moves, the coach\'s strength untouched', () => {
    const { state, step } = nextDialState(FP, null, rows([I, P, P, P]), 100);
    expect(step).toMatchObject({ dial: 'plantDepth', from: 1, to: 2, direction: 'up' });
    expect(state.dials.strengthOffset).toBe(FP.coachDials.strengthOffset);
  });

  it('passed at the deeper shot, the card graduates — the ladder steps it no further', () => {
    const deeper: DialStateRecord = { missionId: FP.id, dials: { ...FP.coachDials, plantDepth: 2 }, lastMoved: 'plantDepth', movedAt: 5, updatedAt: 5 };
    expect(nextDialState(FP, deeper, rows([P, P, P, P, P], 10), 200).step).toBeNull();
  });

  it('a falling rate at the deeper shot steps the SHOT back, not the coach', () => {
    const deeper: DialStateRecord = { missionId: FP.id, dials: { ...FP.coachDials, plantDepth: 2 }, lastMoved: 'plantDepth', movedAt: 5, updatedAt: 5 };
    expect(nextDialState(FP, deeper, rows([I, I, I, P, I], 10), 200).step).toMatchObject({ dial: 'plantDepth', from: 2, to: 1, direction: 'back' });
  });

  it('the coach always plays at the student\'s level: the ladder never names its strength, and a falling rate at the first shot steps nothing', () => {
    // David 2026-10-21: "not the level of the coach, but the slip becomes more
    // subtle … coach still plays to match the user's level".
    expect(FP.ladder?.map((r) => r.dial)).toEqual(['plantDepth']);
    expect(nextDialState(FP, null, rows([I, I, I, I, I]), 100).step).toBeNull();
  });

  it('a card without its own ladder climbs nothing', () => {
    expect(MISSIONS['kq-mate'].ladder).toBeUndefined();
    expect(nextDialState(MISSIONS['kq-mate'], null, rows([I, P, P, P]), 100).step).toBeNull();
  });
});

