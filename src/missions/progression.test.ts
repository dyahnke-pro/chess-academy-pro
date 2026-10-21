import { describe, expect, it } from 'vitest';
import { cardProgress, graduationBar } from './progression';
import type { MissionOutcome } from './missionCard';

const CARD = { level: 1, graduate: { firstTryPasses: 3 } };
let clock = 0;
const active = (...outcomes: MissionOutcome[]): Array<{ outcome: MissionOutcome; at: number }> =>
  outcomes.map((outcome) => ({ outcome, at: ++clock }));
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
    const hard = { level: 19, graduate: { firstTryPasses: 3 } };
    expect(graduationBar(hard)).toBe(4);
    expect(cardProgress(hard, active(P, P, P, I, I)).status).toBe('active');
    expect(cardProgress(hard, active(P, P, P, I, P)).status).toBe('graduated');
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
