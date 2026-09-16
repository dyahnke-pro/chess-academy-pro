import { describe, it, expect } from 'vitest';
import { decide } from './coachDecider';
import type { ImportanceSignals } from './narrationImportance';

const PIN = '[tactic] Your bishop on g4 pins their bishop on e2 against their queen on d1.';
const BATTERY = '[tactic] Their queen on d1 and their bishop on e2 form a battery on the diagonal, bearing down on your bishop on g4.';
const TRIVIA = '[consequence] It nudged the balance your way.';
const SQ = new Map<string, readonly string[]>([[PIN, ['g4', 'e2', 'd1']], [BATTERY, ['d1', 'e2', 'g4']]]);
const bundle = { facts: [PIN, BATTERY, TRIVIA], squares: SQ, incoming: new Set([BATTERY]) };
const student = { rating: 1500, weaknesses: [] };

const quiet: ImportanceSignals = {
  decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false,
  evalCpWhitePov: 20, wdl: null,
};
const blunder: ImportanceSignals = { ...quiet, cpLossCp: 300 };
const decided: ImportanceSignals = { ...blunder, evalCpWhitePov: 2000 };

describe('coachDecider — one door for the whole decision', () => {
  it('a real moment speaks, and the one-claim duplicate is already collapsed', () => {
    const d = decide(blunder, student, bundle, 'interrupt');
    expect(d.speak).toBe(true);
    expect(d.spoken).toContain(BATTERY);
    expect(d.spoken).not.toContain(PIN);      // same geometry, theirs wins
    expect(d.quiet.find((q) => q.text === PIN)?.why).toBe('subsumed');
  });

  it('a decided game is silent — the contested gate, not a second criticality', () => {
    const d = decide(decided, student, bundle, 'interrupt');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('importance');
  });

  it("this student's need can silence a moment the board thinks is fine", () => {
    const d = decide(blunder, { ...student, need: { speak: false } }, bundle, 'interrupt');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('need');
  });

  it('ABSENT need data is not silence — a cold student meets a teaching coach', () => {
    const d = decide(blunder, { ...student, need: null }, bundle, 'interrupt');
    expect(d.speak).toBe(true);
  });

  it('every fact is accounted for on every path — silence always has a reason', () => {
    for (const [sig, st] of [
      [blunder, student], [decided, student], [blunder, { ...student, need: { speak: false } }],
    ] as const) {
      const d = decide(sig, st, bundle, 'interrupt');
      expect(d.spoken.length + d.quiet.length).toBe(bundle.facts.length);
    }
  });

  it('ordering puts the most important fact first', () => {
    const d = decide(blunder, student, bundle, 'interrupt');
    expect(d.spoken[0]).toBe(BATTERY); // tactic (84) outranks consequence (12)
  });
});

describe('posture — what silence MEANS on this surface', () => {
  it("a WALK never loses a ply to the moment gate — the student asked for the sequence", () => {
    // The live-surface gate applied to review cut a 46-ply game to 6 narrated
    // plies with every test green. Only reading the narration caught it.
    const d = decide(decided, student, bundle, 'walk');
    expect(d.speak).toBe(true);
  });

  it('an INTERRUPT surface must earn the interruption', () => {
    expect(decide(decided, student, bundle, 'interrupt').speak).toBe(false);
  });

  it("the student's own need still silences a walk — that gate is theirs, not the board's", () => {
    const d = decide(blunder, { ...student, need: { speak: false } }, bundle, 'walk');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('need');
  });
});

describe('ONE door — no surface composes the decision itself', () => {
  it('review calls the decider, not its parts', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'src/services/coachFeatureService.ts'), 'utf8');
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code).toMatch(/decide\(/);
    // Composing importance + selection + ranking by hand is how the three
    // deciders drifted apart in the first place. The parts stay exported for
    // their own unit tests; a SURFACE reaches them only through `decide`.
    expect(code).not.toMatch(/computeImportance\(/);
    expect(code).not.toMatch(/selectFacts\(/);
    expect(code).not.toMatch(/rankFacets\(/);
  });
});
