// DOES THE LOOP ACTUALLY CLOSE?
//
// CLAUDE.md, level I: "The coach learns you, and what it learned changes what
// it says next." That is the app. This file is the only test that asserts it
// END TO END — one position, two students, different SPOKEN OUTPUT.
//
// 🚨 WHY THIS EXISTS. Six test files already prove the loop at the COMPUTER
// level (needScore, capabilityRead, studentMomentBoost, liveNeedGate,
// reviewNeedGate, needCoverage.report): same board, different student data,
// different VERDICT. Every one of them was green through all four of the
// wiring bugs found by hand on 2026-09-18:
//
//   positionFacts never passed `clauseKind`  -> weaknessTerm (55 against a 50
//                                               bar) dead on every live surface
//   teachingSelector passed only `conceptId` -> review blind to positional holes
//   review's decide() passed no momentBoost  -> holes could not raise a moment
//   grey never reached the ranker at all
//
// In all four the computer answered correctly and the WIRE TO THE SENTENCE was
// missing. A score-level assertion cannot see that. This asserts on the text.
//
// 🚨 AND WHY IT ASSERTS ON A WARM STUDENT. A blank profile scores 100 on the
// cold-start prior and therefore speaks everywhere, which MASKS the difference
// completely — the same masking that made every prod audit green on all four
// bugs, because audits run fresh devices. Profile A must be past
// COLD_START_GAMES or this gate is theatre.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePositionFacts } from './positionFacts';
import { COLD_START_GAMES, type StudentNeedContext } from './needScore';
import type { WeaknessSignal } from './weaknessSignal';
import type { AnalysisLine } from '../types';

/** A modest top-2 gap: NOT a critical moment, so importance does not fire on
 *  its own and NEED is what decides. If the gap were large the moment would
 *  speak for both students and the gate would prove nothing. */
const line = (rank: number, evaluation: number): AnalysisLine =>
  ({ rank, evaluation, moves: [], mate: null });

const analysis = {
  topLines: [line(1, 30), line(2, 10), line(3, 5)],
  evaluation: 30,
  isMate: false,
  mateIn: null,
  depth: 16,
  seldepth: 18,
  wdl: null,
};

/** Warm student, line already familiar — so unfamiliarity is 0 and the ONLY
 *  thing that can earn a word is their own recorded hole. */
const base = (signals: readonly WeaknessSignal[]): StudentNeedContext => ({
  rating: 1400,
  gamesPlayed: COLD_START_GAMES + 20,
  signals,
  bookDepartures: [],
  capabilities: new Map(),
  openingId: null,
  lineReps: new Array(60).fill(5),
  openingScore: 0.5,
  overallScore: 0.5,
});

/**
 * The hole must MATCH what the board actually computes here, through the join
 * the PRODUCTION code uses — not the one that reads naturally.
 *
 * This position produces one fact: a latent knight fork on e6 that the STUDENT
 * can set up. Since T5 (2026-09-21) the seat decides the kind: the student's
 * own fork is emitted as `latent-chance`, and `matchClauseKind('latent-chance')`
 * reaches `analysis:tactic:fork`. So a FORK-blind student is the one this
 * clause speaks to — the vocabulary mismatch the previous fixture named (a pin
 * hole matched to a fork clause) was the T5 bug, and this gate went red the
 * night it was fixed because the fixture still seeded the pin. Found 2026-09-22
 * (WO-STANDARD-01 §C): the hole now names what the board computes.
 */
const matchingHole = {
  clusterId: 'analysis:tactic:fork',
  bucket: 'tactical',
  label: 'Forks',
  openCount: 6,
  severity: 80,
  lifecycleStatus: 'persistent',
  trend: 'worsening',
  puzzleThemes: ['fork'],
  total: 14,
  capabilityTag: null,
  proven: false,
} as unknown as WeaknessSignal;

/**
 * A real MIDDLEGAME position — a closed Ruy Lopez at move 13, White to move.
 *
 * 🚨 PAST MOVE 10 ON PURPOSE. `positionFacts` suppresses its whole positional
 * set while `fullmove < 10` ("PositionFacts is a MIDDLEGAME live supply; the
 * opening is owned by corpus notes"). The first draft of this gate stopped at
 * move 9 and BOTH students got zero clauses — the test failed for a fixture
 * reason that looked exactly like the product defect it is meant to catch.
 * That is the vacuity trap this file exists to close, so it is named here.
 */
function board(): string {
  const c = new Chess();
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7',
    'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5', 'd4', 'Qc7',
    'Nbd2', 'cxd4'];
  for (const s of sans) c.move(s);
  return c.fen();
}

async function say(signals: readonly WeaknessSignal[]): Promise<string[]> {
  const fen = board();
  const pf = await computePositionFacts({
    posture: 'walk',
    fen,
    moverColor: 'w',
    studentColor: 'w',
    rating: 1400,
    analysis,
    studentWeaknesses: signals,
    studentNeedContext: base(signals),
  });
  return pf.clauses.map((c) => c.text);
}

/** Guards the guard: if the composer says NOTHING to either student the
 *  differential below is vacuous, and it would read as a pass-shaped failure
 *  rather than a broken fixture. */
async function nonEmpty(): Promise<string[]> {
  const out = await say([matchingHole]);
  expect(out.length, 'the composer produced no clauses at all — fixture is broken, not the product')
    .toBeGreaterThan(0);
  return out;
}

describe('THE LOOP CLOSES — a recorded hole changes what is SPOKEN', () => {
  /**
   * PROVEN TO FAIL, 2026-09-18. With `positionFacts`' `clauseKind`/`conceptId`
   * wire reverted to `null` this test goes RED; restored, GREEN. A differential
   * gate that cannot fail proves nothing, so that check is part of the build.
   */
  it('the same position says something DIFFERENT to a student who has this hole on record', async () => {
    const withHole = await nonEmpty();
    const blank = await say([]);
    expect(
      withHole.join(' | '),
      'same board, same engine read, one student has a RECORDED HOLE and the other does not — '
      + 'if the spoken output is identical, the student model reached the computers and never reached the voice',
    ).not.toBe(blank.join(' | '));
  }, 60_000);
});
