import { describe, it, expect } from 'vitest';
import { detectPlanRace, planRaceClause, pushesToPromote } from './planRace';
import { structurePlan } from './boardPlan';
import { Chess } from 'chess.js';

// Every FEN below was measured with a probe before being pinned here — this
// session burned three wrong FEN guesses on latentFork by asserting first and
// checking later.
const LEVEL_YOURS = '8/8/8/P7/7p/8/8/K6k w - - 0 1';   // a5 vs h4, 3 each, White to move
const LEVEL_THEIRS = '8/8/8/P7/7p/8/8/K6k b - - 0 1';  // same, Black to move
const THEY_FASTER = '8/8/8/P7/8/7p/8/K6k w - - 0 1';   // a5 (3) vs h3 (2)
const YOU_FASTER = '8/P7/8/8/7p/8/8/K6k w - - 0 1';    // a7 (1) vs h4 (3)
const BLOCKADED = '8/8/8/8/7p/n7/P7/K6k w - - 0 1';    // a2 dead behind a black knight
const ONE_SIDE = '8/8/8/P7/8/8/8/K6k w - - 0 1';       // only White has a passer

describe('planRace — the race, not just the plans', () => {
  it('a BLOCKADED passer is not in a race — it is stuck', () => {
    // The first draft called a2 "6 pushes from queening" with an enemy knight on
    // a3 and the pawn unable to move at all. That is the exact lie this computer
    // exists to kill, so it is the first thing pinned.
    expect(new Chess(BLOCKADED).moves({ verbose: true }).some((m) => m.piece === 'p')).toBe(false);
    expect(detectPlanRace(BLOCKADED, 'w')).toBeNull();
    expect(planRaceClause(BLOCKADED, 'w', 'live')).toBeNull();
  });

  it('one runner is not a race — silence, never a one-sided number', () => {
    const r = detectPlanRace(ONE_SIDE, 'w');
    expect(r?.kind).not.toBe('passer-race');
  });

  it('a LEVEL count is still a race — the move decides it', () => {
    // The first draft returned null on equal counts and threw away the clearest
    // case there is: both runners three away, and whoever moves first queens first.
    const yours = detectPlanRace(LEVEL_YOURS, 'w');
    const theirs = detectPlanRace(LEVEL_THEIRS, 'w');
    expect(yours).toMatchObject({ yourPushes: 3, theirPushes: 3, youQueenFirst: true });
    expect(theirs).toMatchObject({ yourPushes: 3, theirPushes: 3, youQueenFirst: false });
    expect(planRaceClause(LEVEL_YOURS, 'w', 'live')).toMatch(/the move is yours/);
    expect(planRaceClause(LEVEL_THEIRS, 'w', 'live')).toMatch(/the move is theirs/);
  });

  it('counts the pushes, and moving first cannot rescue a slower pawn', () => {
    expect(detectPlanRace(THEY_FASTER, 'w')).toMatchObject({ youMoveFirst: true, youQueenFirst: false });
    expect(planRaceClause(THEY_FASTER, 'w', 'live')).toMatch(/they get there first/);
    expect(planRaceClause(YOU_FASTER, 'w', 'live')).toMatch(/you get there first/);
  });

  it('says "1 push", never "1 pushes"', () => {
    const c = planRaceClause(YOU_FASTER, 'w', 'live') ?? '';
    expect(c).toContain('1 push from queening');
    expect(c).not.toContain('1 pushes');
  });

  it('never promises the result — the arithmetic guides the plan, it does not decide it', () => {
    // A middlegame piece can still blockade or capture, so a bare "you win this
    // race" would overstate the why.
    expect(planRaceClause(YOU_FASTER, 'w', 'live')).toContain('if nobody interferes');
  });

  it('the double step is a real tempo, and only when the path is clear', () => {
    const clear = new Chess('8/8/8/8/7p/8/P7/K6k w - - 0 1');
    expect(pushesToPromote(clear, 'a2', 'w')).toBe(5); // 6 ranks, one double step
    const blocked = new Chess('8/8/8/8/7p/n7/P7/K6k w - - 0 1');
    expect(pushesToPromote(blocked, 'a2', 'w')).toBe(6);
  });

  it('REGISTER is required and actually changes the tense', () => {
    const live = planRaceClause(THEY_FASTER, 'w', 'live') ?? '';
    const review = planRaceClause(THEY_FASTER, 'w', 'review') ?? '';
    expect(live).toMatch(/both sides have a runner/);
    expect(review).toMatch(/both sides had a runner/);
    expect(live).not.toEqual(review);
  });

  it('obeys the one-perspective law — no we/our/us, no gendered pronoun', () => {
    for (const fen of [LEVEL_YOURS, LEVEL_THEIRS, THEY_FASTER, YOU_FASTER]) {
      for (const reg of ['live', 'review'] as const) {
        for (const seat of ['w', 'b'] as const) {
          const c = planRaceClause(fen, seat, reg);
          if (!c) continue;
          expect(c).not.toMatch(/\b(we|our|us)\b/i);
          expect(c).not.toMatch(/\b(he|him|his|she|her|hers)\b/i);
        }
      }
    }
  });

  it('THE ELSE-CHAIN FIX: structurePlan no longer says "push it" without checking theirs', () => {
    // Before this build `structurePlan` returned on the student's own passer and
    // never reached the enemy passer branch, so with runners on both wings it
    // said "push it and make them deal with the promotion" having never looked
    // at whether theirs queens first.
    const slow = structurePlan(THEY_FASTER, 'w') ?? '';
    expect(slow).toMatch(/they get there first/);
    expect(slow).not.toMatch(/push it and make them deal with the promotion/);
    // …and it still says push when the race really is yours.
    expect(structurePlan(YOU_FASTER, 'w') ?? '').toMatch(/the race is yours/);
    // A lone passer keeps the original, correct plan.
    expect(structurePlan(ONE_SIDE, 'w') ?? '').toMatch(/push it/);
  });

  it('WITH QUEENS ON the race is a fact, not a marching order', () => {
    // Read at Fischer–Spassky 1972 move 27: both runners three pushes away and
    // the move White's, but with queens and rooks still on, "push, and make them
    // be the one who stops to defend" sends the student into a sharp middlegame.
    const FISCHER = '1r3n1k/r3q1p1/7p/p1p1Pp2/2Bp4/1P5Q/P5PP/2R2RK1 w - - 0 27';
    const r = detectPlanRace(FISCHER, 'w');
    expect(r).toMatchObject({ kind: 'passer-race', yourPushes: 3, theirPushes: 3, queensOn: true, youQueenFirst: true });
    const c = planRaceClause(FISCHER, 'w', 'live') ?? '';
    expect(c).toMatch(/once the queens come off/);
    expect(c).not.toMatch(/push, and make them be the one who stops/);
    // …and with the queens gone the direct instruction comes back.
    const NO_QUEENS = '8/P7/8/8/7p/8/8/K6k w - - 0 1';
    expect(detectPlanRace(NO_QUEENS, 'w')).toMatchObject({ queensOn: false });
    expect(planRaceClause(NO_QUEENS, 'w', 'live') ?? '').toMatch(/push, and make them/);
  });

  it('a FILE collision never stands in for the passer plan', () => {
    // Karpov–Kasparov move 14: White has a passed d-pawn AND a contested c-file.
    // The first cut let the file clause replace the plan, so the student was told
    // about the c-file and the passed pawn was never mentioned at all.
    const KK = 'r2q1rk1/1p3ppp/p4n2/2bP1b2/1n6/N1N2B2/PP3PPP/R1BQ1RK1 w - - 7 14';
    expect(detectPlanRace(KK, 'w')?.kind).toBe('file-collision');
    const plan = structurePlan(KK, 'w') ?? '';
    expect(plan).toMatch(/passed pawn on d5/);
    expect(plan).not.toMatch(/c-file/);
  });

  it('starts with a capital and ends with a stop when structurePlan speaks it', () => {
    const s = structurePlan(THEY_FASTER, 'w') ?? '';
    expect(s[0]).toBe(s[0]?.toUpperCase());
    expect(s.endsWith('.')).toBe(true);
  });
});
