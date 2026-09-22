import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { studentMomentBoost, holeOpensMoment, GREY_BOOST, NO_BOOST, RECURRENCE_OPENS_AT } from './studentMomentBoost';
import { computeImportance } from './narrationImportance';
import type { CapabilityProfile, CapabilityProfileEntry } from './capabilityEvidence';
import type { WeaknessSignal } from './weaknessSignal';

const TAG = 'ignored-opponent-threat' as never;
const caps = (e: CapabilityProfileEntry | null): CapabilityProfile =>
  (e ? new Map([[TAG, e]]) : new Map()) as CapabilityProfile;

const persistentHole = {
  clusterId: 'analysis:tactic:hanging_piece', bucket: 'tactics', label: 'x',
  openCount: 6, severity: 80, lifecycleStatus: 'persistent', trend: 'worsening',
  puzzleThemes: [], total: 14,
} as unknown as WeaknessSignal;

describe('the heat map feeds the RANKER', () => {
  it('GREY raises — never asked is not mastered', () => {
    expect(studentMomentBoost({ posedTags: [TAG], capabilities: caps(null) })).toEqual({ rank: GREY_BOOST, opens: false });
  });

  it('GREEN earns nothing here — the ranker is raise-only, green lowers through need', () => {
    expect(studentMomentBoost({ posedTags: [TAG], capabilities: caps({ held: 9, broken: 0, heldStreak: 9, streakGames: 2 }) })).toEqual(NO_BOOST);
  });

  it('RED outranks GREY when the hole is persistent and worsening', () => {
    const red = studentMomentBoost({ hole: persistentHole, posedTags: [TAG], capabilities: caps(null) });
    expect(red.rank).toBeGreaterThan(GREY_BOOST);
  });

  it('takes the MAX, never the sum', () => {
    const both = studentMomentBoost({ hole: persistentHole, posedTags: [TAG], capabilities: caps(null) });
    const redOnly = studentMomentBoost({ hole: persistentHole });
    expect(both).toEqual(redOnly);
  });

  it('a board that asked nothing contributes nothing', () => {
    expect(studentMomentBoost({ posedTags: [], capabilities: caps(null) })).toEqual(NO_BOOST);
  });

  /**
   * THE LOAD-BEARING ONE. "All computed teachings get spoken when there's
   * something to teach" — the converse being that a ply where NOTHING was
   * computed stays silent by having nothing, not by a gate. `computeImportance`
   * applies the student term only under `rank > 0`, so grey cannot manufacture
   * a moment out of a quiet book ply. If this ever goes green-on-a-quiet-ply,
   * the coach talks on every move of every game.
   */
  it('GREY cannot manufacture a moment out of a quiet ply', () => {
    const quiet = { decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
    const withGrey = computeImportance(quiet, studentMomentBoost({ posedTags: [TAG], capabilities: caps(null) }));
    expect(withGrey.rank).toBe(0);
    expect(withGrey.speak).toBe(false);
  });

  // B2 (decision recorded 2026-09-22): the student's RECORD may flip a verdict
  // — bounded. A RED hole that has recurred opens a quiet CONTESTED moment at
  // its own rank (≤ 30, under every engine tier); grey never does, green never
  // does, a first-time hole never does, and a decided game never does.
  // Negative control: drop the `opens` branch in computeImportance → the first
  // `it` fails; make grey open → the second fails.
  it('a RECURRING RED hole may open a quiet moment — bounded to its own rank', () => {
    const quiet = { decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
    const red = studentMomentBoost({ hole: persistentHole });
    expect(red.opens).toBe(true);
    const opened = computeImportance(quiet, red);
    expect(opened.speak).toBe(true);
    expect(opened.tier).toBe('teaching');
    expect(opened.rank).toBe(red.rank);
    expect(opened.rank).toBeLessThan(40); // under a declared teaching beat, under every engine tier
    // …but never in a decided game — the contested gate holds here too.
    expect(computeImportance({ ...quiet, evalCpWhitePov: 900, wdl: [960, 30, 10] }, red).speak).toBe(false);
  });

  it('a first-time hole, grey and green never open a quiet moment', () => {
    const once = { ...persistentHole, openCount: 1, total: 1 } as WeaknessSignal;
    expect(holeOpensMoment(once)).toBe(false);
    expect(RECURRENCE_OPENS_AT).toBe(2);
    expect(studentMomentBoost({ hole: once }).opens).toBe(false);
    expect(studentMomentBoost({ posedTags: [TAG], capabilities: caps(null) }).opens).toBe(false);
    expect(studentMomentBoost({ posedTags: [TAG], capabilities: caps({ held: 9, broken: 0, heldStreak: 9, streakGames: 2 }) }).opens).toBe(false);
    const fixed = { ...persistentHole, lifecycleStatus: 'fixed' } as WeaknessSignal;
    expect(studentMomentBoost({ hole: fixed }).opens).toBe(false);
  });

  it('but it DOES raise a moment that already fired', () => {
    const real = { decision: null, cpLossCp: null, threatNet: 0, teachingBeat: true, evalCpWhitePov: 20, wdl: null };
    const plain = computeImportance(real, NO_BOOST);
    const boosted = computeImportance(real, studentMomentBoost({ posedTags: [TAG], capabilities: caps(null) }));
    expect(plain.rank).toBeGreaterThan(0);
    expect(boosted.rank).toBe(plain.rank + GREY_BOOST);
  });
});

describe('the wire reaches the ranker on both lanes', () => {
  it('the selector publishes a per-ply boost', () => {
    const src = readFileSync('src/services/teachingSelector.ts', 'utf8');
    expect(src).toMatch(/boostByPly\.set\(p\.ply, studentMomentBoost\(/);
    expect(src).toMatch(/boostByPly,?\s*\}/);
  });

  it('review PASSES it — the package is kept, not reduced to needByPly', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    expect(src, 'review must pass the student term to the ranker')
      .toMatch(/momentBoost: boostByPly\.get\(m\.ply\)/);
    expect(src, 'the selector package must not be reduced to one field again')
      .not.toMatch(/\}\)\.needByPly;/);
  });
});

describe('the door cannot offer a lane a way to forget the student', () => {
  /**
   * THREE INSTANCES OF ONE DEFECT, all found by hand in one session, all
   * invisible to every prod audit (audits run fresh devices, where the
   * cold-start prior masks the whole student model):
   *   NeedPlyInput.clauseKind  — the live lane never passed it, killing the
   *                              largest term in the need score.
   *   StudentContext.momentBoost — review never passed it, so a student's own
   *                              recorded holes could not raise a moment.
   *   StudentContext.need      — review never passed it either.
   * Every one was an OPTIONAL field silently defaulting. The type is the gate;
   * this asserts the type stays that way.
   */
  it('both student terms are REQUIRED on StudentContext', () => {
    const src = readFileSync('src/services/coachDecider.ts', 'utf8');
    expect(src, 'need must be required — null is the answer, absence is not')
      .toMatch(/\n {2}need: \{ speak: boolean \} \| null;/);
    expect(src, 'momentBoost must be required — NO_BOOST is the answer, absence is not')
      .toMatch(/\n {2}momentBoost: StudentBoost;/);
    expect(src).not.toMatch(/\n {2}need\?:/);
    expect(src).not.toMatch(/\n {2}momentBoost\?:/);
  });

  it('clauseKind is REQUIRED on NeedPlyInput', () => {
    const src = readFileSync('src/services/needScore.ts', 'utf8');
    expect(src).toMatch(/\n {2}clauseKind: string \| null;/);
    expect(src).not.toMatch(/\n {2}clauseKind\?:/);
  });
});

describe('the live lane feeds the heat map too', () => {
  it('positionFacts routes its boost through the ONE computer', () => {
    const src = readFileSync('src/services/positionFacts.ts', 'utf8');
    expect(src).toMatch(/momentBoost: studentMomentBoost\(\{/);
    expect(src, 'the weakness-only boost is gone, not shadowed')
      .not.toMatch(/function momentWeaknessBoost/);
  });

  it('the live lane passes the STUDENT move, never the coach reply', () => {
    // 🚨 THE ATTRIBUTION TRAP. At this call site `probe`/`m` are the COACH's
    // reply (`const probe = new Chess(move.fen); const m = probe.move(reply)`),
    // while `fenBefore` + `move.san` are the student's. Using the former files
    // the OPPONENT's posed capabilities under the student — green for a move
    // they never made, and grey for a question they were never asked.
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src, "the student's own board and move, handed over raw")
      .toMatch(/lastMove: \{ fenBefore, san: move\.san, cpLoss: studentCpLoss \}/);
    expect(src, 'never the coach reply').not.toMatch(/lastMove: \{[^}]*probe/);
    expect(src, 'never the coach reply').not.toMatch(/lastMove: \{[^}]*san: m\.san/);
    // and the surface must NOT compose the computer itself — that is the
    // composition ceiling, which this wire tripped on its first cut.
    expect(src).not.toMatch(/capabilitiesPosed\(/);
  });

  it('an ungraded ply is never read as clean', () => {
    const pf = readFileSync('src/services/positionFacts.ts', 'utf8');
    expect(pf, 'null must survive to the guard — unknown is not clean')
      .toMatch(/lm\.cpLoss == null \? undefined : movePlayedCleanly\(lm\.cpLoss\)/);
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src, 'the surface must not pre-decide it either')
      .toMatch(/cpLoss: studentCpLoss/);
  });
});
