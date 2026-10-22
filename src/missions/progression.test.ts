import { describe, expect, it } from 'vitest';
import { cardProgress } from './progression';
import { graduationBar } from './ladder';
import { LEVEL_1_DIALS } from './registry';
import type { DialRung, MissionOutcome } from './missionCard';

/** A card with a lesson ladder (the earned piece's shot depth). */
const CARD = { level: 1, graduate: { firstTryPasses: 3 }, coachDials: LEVEL_1_DIALS, ladder: [{ dial: 'plantDepth', values: [1, 2, 3] }] as readonly DialRung[] };
let clock = 0;
/** Active games played at the graduation level (one step above the card's own
 *  dials) unless `harder` says otherwise. */
const at = (harder: number, ...outcomes: MissionOutcome[]): Array<{ outcome: MissionOutcome; at: number; harder: number }> =>
  outcomes.map((outcome) => ({ outcome, at: ++clock, harder }));
const active = (...outcomes: MissionOutcome[]): Array<{ outcome: MissionOutcome; at: number; harder: number }> => at(1, ...outcomes);
const watched = (...outcomes: MissionOutcome[]): Array<{ outcome: MissionOutcome; at: number; watcher: true }> =>
  outcomes.map((outcome) => ({ outcome, at: ++clock, watcher: true as const }));
const P: MissionOutcome = 'pass-first-try';
const R: MissionOutcome = 'pass-retry';
const M: MissionOutcome = 'missed';
const I: MissionOutcome = 'incomplete';

describe('progression — graduation', () => {
  it('exactly 3 first-try passes in the last 5 active games graduates', () => {
    expect(cardProgress(CARD, active(P, I, P, I, P)).status).toBe('graduated');
  });

  it('2 of 5 does not; and retries never count', () => {
    expect(cardProgress(CARD, active(P, I, P, I, I)).status).toBe('active');
    expect(cardProgress(CARD, active(R, R, R, R, R, P, P)).status).toBe('active');
  });

  it('only the LAST five count — old passes slide out of the window', () => {
    // P P then five games with one P: at no point do 3 sit in one window of 5.
    expect(cardProgress(CARD, active(P, P, I, I, I, P, I, I)).status).toBe('active');
  });

  it('Level 19 and up asks 4 of 5', () => {
    const hard = { level: 19, graduate: { firstTryPasses: 3 }, coachDials: LEVEL_1_DIALS };
    expect(graduationBar(hard)).toBe(4);
    expect(cardProgress(hard, active(P, P, P, I, I)).status).toBe('active');
    expect(cardProgress(hard, active(P, P, P, I, P)).status).toBe('graduated');
  });
});

describe('progression — the coach steps up before a card graduates (2026-10-21)', () => {
  it('three first-try passes at the card\'s own setting do NOT graduate it', () => {
    expect(cardProgress(CARD, at(0, P, P, P, P, P)).status).toBe('active');
  });

  it('it graduates on three first-try passes at the harder setting', () => {
    const p = cardProgress(CARD, [...at(0, P, P, P), ...at(1, P, I, P, P)]);
    expect(p.status).toBe('graduated');
    expect(p.everGraduated).toBe(true);
  });

  it('easier passes in the window do not make up the bar', () => {
    expect(cardProgress(CARD, [...at(0, P, P, P), ...at(1, P, P)]).status).toBe('active');
  });

  it('rows written before the dial was recorded count as the card\'s own setting', () => {
    const old = [1, 2, 3, 4, 5].map(() => ({ outcome: P, at: ++clock }));
    expect(cardProgress(CARD, old).status).toBe('active');
  });

  it('a card with no room above its dials graduates at its own setting', () => {
    const top = { ...CARD, coachDials: { ...LEVEL_1_DIALS, plantDepth: 3 as const } };
    expect(cardProgress(top, at(0, P, P, P)).status).toBe('graduated');
  });

  it('a card with no ladder (the endings) graduates at its own setting — the coach\'s strength is no step', () => {
    const { ladder: _ladder, ...noLadder } = CARD;
    expect(cardProgress(noLadder, at(0, P, P, P)).status).toBe('graduated');
    // Fail twin: the same rows on the laddered card are not enough.
    expect(cardProgress(CARD, at(0, P, P, P)).status).toBe('active');
  });
});

describe('progression — watchers', () => {
  const grad = (): Array<{ outcome: MissionOutcome; at: number; watcher?: true }> => active(P, P, P);

  it('one watched miss in five is not a pattern: still graduated', () => {
    expect(cardProgress(CARD, [...grad(), ...watched(M, P, P, P, P)]).status).toBe('graduated');
  });

  it('two watched misses in the last five reactivate it', () => {
    const p = cardProgress(CARD, [...grad(), ...watched(P, M, P, M)]);
    expect(p.status).toBe('reactivated');
    expect(p.everGraduated).toBe(true);
  });

  it('two misses five games apart are not "2 of the last 5"', () => {
    expect(cardProgress(CARD, [...grad(), ...watched(M, P, P, P, P, M)]).status).toBe('graduated');
  });

  it('after reactivation it graduates again on a FRESH window — the old passes do not count twice', () => {
    const back = [...grad(), ...watched(M, M)];
    expect(cardProgress(CARD, [...back, ...active(P, P)]).status).toBe('reactivated');
    expect(cardProgress(CARD, [...back, ...active(P, P, P)]).status).toBe('graduated');
  });

  it('rows are read in time order whatever order they arrive in', () => {
    const rows = [...grad(), ...watched(M, M)].reverse();
    expect(cardProgress(CARD, rows).status).toBe('reactivated');
  });
});
