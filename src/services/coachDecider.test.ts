import { ALL_GREY } from './teachingLayers';
import { describe, it, expect } from 'vitest';
import { decide } from './coachDecider';
import type { ImportanceSignals } from './narrationImportance';
import { NO_BOOST } from './studentMomentBoost';

const PIN = '[tactic] Your bishop on g4 pins their bishop on e2 against their queen on d1.';
const BATTERY = '[tactic] Their queen on d1 and their bishop on e2 form a battery on the diagonal, bearing down on your bishop on g4.';
const TRIVIA = '[consequence] It nudged the balance your way.';
const SQ = new Map<string, readonly string[]>([[PIN, ['g4', 'e2', 'd1']], [BATTERY, ['d1', 'e2', 'g4']]]);
const bundle = { facts: [PIN, BATTERY, TRIVIA], squares: SQ, incoming: new Set([BATTERY]) };
// `need` AND `momentBoost` are both REQUIRED on StudentContext, and null/0
// are real answers — the
// type says so because making it optional is exactly how review ended up
// never supplying it. The fixture omitted it, so this gate never once
// exercised the absent-need path it documents (found 2026-09-19).
const student = { rating: 1500, weaknesses: [], need: null, momentBoost: NO_BOOST, layers: ALL_GREY };

const quiet: ImportanceSignals = {
  decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false,
  evalCpWhitePov: 20, wdl: null,
};
const blunder: ImportanceSignals = { ...quiet, cpLossCp: 300 };
/** A real but ordinary swing — the tier NEED is allowed to veto. */
const swing: ImportanceSignals = { ...quiet, cpLossCp: 120 };
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
    const d = decide(swing, { ...student, need: { speak: false } }, bundle, 'interrupt');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('need');
  });

  // B5 (2026-09-22): the veto is TIER-AWARE. `needScore`'s own contract has
  // always said a swing/must-defend/mate speaks on its own importance
  // regardless of need; the door was silencing a hanging piece because the
  // student knew the LINE. Negative control: with the tier guard removed, the
  // first two assertions fail (speak=false, reason='need').
  it('NEED cannot veto a blunder, a must-defend, an only-move or a mate — those are the board, not a lesson', () => {
    const hang: ImportanceSignals = { ...quiet, threatNet: 3 };
    const onlyMove: ImportanceSignals = { ...quiet, decision: { severity: 'only-move', gapCp: 400 } };
    const mate: ImportanceSignals = { ...quiet, evalCpWhitePov: 100000 };
    for (const sig of [blunder, hang, onlyMove, mate]) {
      const d = decide(sig, { ...student, need: { speak: false } }, bundle, 'interrupt');
      expect(d.speak, `tier ${d.tier} must speak on importance`).toBe(true);
      expect(d.reason).toBe('spoken');
    }
    // …and the lesson tiers are still the student's to decline.
    const critical: ImportanceSignals = { ...quiet, decision: { severity: 'critical', gapCp: 150 } };
    const teaching: ImportanceSignals = { ...quiet, teachingBeat: true };
    for (const sig of [swing, critical, teaching]) {
      const d = decide(sig, { ...student, need: { speak: false } }, bundle, 'interrupt');
      expect(d.speak, `tier ${d.tier} is need-gated`).toBe(false);
      expect(d.reason).toBe('need');
    }
  });

  // B9 (2026-09-22): every quiet fact names the GATE that closed it, so the
  // emitted `quietBy` can tell importance from need. Negative control: with
  // both closes labelled 'below-bar' again, both assertions fail.
  it('a door-closed ply files every fact under the gate that closed it', () => {
    const byImportance = decide(decided, student, bundle, 'interrupt');
    expect(byImportance.quiet.map((q) => q.why)).toEqual(bundle.facts.map(() => 'importance'));
    const byNeed = decide(swing, { ...student, need: { speak: false } }, bundle, 'interrupt');
    expect(byNeed.quiet.map((q) => q.why)).toEqual(bundle.facts.map(() => 'need'));
  });

  it('ABSENT need data is not silence — a cold student meets a teaching coach', () => {
    const d = decide(blunder, { ...student, need: null }, bundle, 'interrupt');
    expect(d.speak).toBe(true);
  });

  it('every fact is accounted for on every path — silence always has a reason', () => {
    for (const [sig, st] of [
      [blunder, student], [decided, student], [swing, { ...student, need: { speak: false } }],
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
    const d = decide(swing, { ...student, need: { speak: false } }, bundle, 'walk');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('need');
  });
});

describe('ONE door — no surface composes the decision itself', () => {
  // `positionFacts` is the composer behind FOUR live surfaces (Learn,
  // read-this-position, live play commentary, phase transitions) plus the "Why?"
  // button — so it drifting is five surfaces drifting. It called
  // `computeImportance` directly until 2026-09-16 and therefore never subsumed
  // anything: the pin and the must-defend about one geometry both spoke.
  const SURFACES = ['src/services/coachFeatureService.ts', 'src/services/positionFacts.ts'];

  it.each(SURFACES)('%s calls the decider, not its parts', async (file) => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), file), 'utf8');
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code).toMatch(/\bdecide\(/);
    // Composing importance + selection + ranking by hand is how the three
    // deciders drifted apart in the first place. The parts stay exported for
    // their own unit tests; a SURFACE reaches them only through `decide` (or
    // through `judgeMoment`, which IS the door's first step, for a composer that
    // needs the tier before it has facts to hand over).
    expect(code).not.toMatch(/computeImportance\(/);
    expect(code).not.toMatch(/selectFacts\(/);
    expect(code).not.toMatch(/rankFacets\(/);
  });

  it('every surface that composes a briefing DECLARES a posture', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    // There is no safe default (CLAUDE.md §G4.5.15): guessing 'interrupt' makes
    // a lesson mute, guessing 'walk' makes a play surface chatty. TypeScript
    // enforces this at the call sites; this pins the TYPE itself, so nobody
    // "fixes" a compile error by giving the field a default.
    const src = readFileSync(join(process.cwd(), 'src/services/positionFacts.ts'), 'utf8');
    expect(src).toMatch(/posture: SurfacePosture;/);
    expect(src).not.toMatch(/posture\?: SurfacePosture/);
  });
});
