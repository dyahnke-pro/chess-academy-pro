// 🔒 A YIELD IS A PREDICTION, AND SOMETHING MUST CHECK IT (2026-09-21).
//
// `calculation-depth` stood down whenever the punishing line's blow landed on
// the opponent's first or second move: "the punishment Bd7+ is immediate —
// another fundamental owns it". Measured on a real prod review at ply 64, NO
// other fundamental fired. The student got nothing and the diagnostic tape
// recorded a confident sentence about a handoff that never happened.
//
// The same judgement was also written TWICE and the copies disagreed. The
// detector declined on the PV's SHAPE; `attributePrinciples` subsumed
// `calculation-depth` on what ACTUALLY FIRED. The detector ran first, so the
// conditional copy never got to decide. Both now read `CALC_DEPTH_CLAIMANTS`.
//
// This gate holds the behaviour, not the wording of any one detector: a yield
// whose named claimants do not fire must SAY SO, and a yield that is honoured
// must stay quiet. Both directions, because a reporter that always fires is as
// useless as one that never does.
import { describe, it, expect } from 'vitest';
import { attributePrinciples } from './principleAttribution';

const ALAPIN = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6'];
const base = { historySans: ALAPIN, bestSan: 'e6', classification: 'mistake' as const };

/** An immediate punishment — the capture lands on the opponent's FIRST move,
 *  which is what makes `calculation-depth` stand down. */
const IMMEDIATE = { evalBefore: 30, evalAfterPlayed: -200, pvAfterPlayed: ['Bxf6', 'gxf6', 'Qh5'] };
/** A DEEP punishment — quiet, quiet, then the blow. `calculation-depth` keeps
 *  this one, so there is no yield to report. */
const DEEP = { evalBefore: 30, evalAfterPlayed: -200, pvAfterPlayed: ['Rd1', 'Be6', 'Bxb6', 'axb6'] };

function whyFor(extra: Record<string, unknown>): string {
  const why: string[] = [];
  attributePrinciples({ ...base, ...extra } as Parameters<typeof attributePrinciples>[0], why);
  return why.join(' | ');
}

describe('a yield is checked against what actually fired', () => {
  it('reports an UNHONOURED yield — the named claimants did not fire', () => {
    const why = whyFor(IMMEDIATE);
    expect(why, 'the stand-down itself must still be recorded').toMatch(/calculation-depth: the punishment Bxf6 is immediate/);
    expect(why, 'and the prediction it made must be checked').toMatch(/YIELD UNHONOURED/);
    // It must NAME who it expected, or the hole cannot be acted on.
    expect(why).toMatch(/loose-piece/);
    expect(why).toMatch(/ignored-threat/);
  });

  it('states the two facts SEPARATELY — claimants missing vs the ply unnamed', () => {
    // The first draft of this reporter conflated them and was wrong on its own
    // first probe: it said "this ply is unattributed" about a ply that three
    // other detectors had attributed. An unhonoured yield on a well-covered ply
    // is a mis-stated CLAIMANT LIST; an unhonoured yield on a bare ply is a
    // COVERAGE hole. Different fixes, so the line must distinguish them.
    const why = whyFor(IMMEDIATE);
    expect(why).toMatch(/none fired;/);
    expect(why, 'this ply IS covered by other detectors, and the line must say so rather than cry hole')
      .toMatch(/the ply still spoke via \[[^\]]+\]/);
    expect(why).not.toMatch(/NOTHING else fired/);
  });

  it('NEGATIVE CONTROL — no yield, no report', () => {
    const why = whyFor(DEEP);
    expect(why, 'calculation-depth did not stand down here, so nothing may be reported')
      .not.toMatch(/YIELD UNHONOURED/);
  });

  it('NEGATIVE CONTROL — the sink is opt-in and costs nothing when nobody asks', () => {
    // No `why` array passed: the deferral ledger is never allocated and the
    // result is identical. A diagnostic that changes the answer is a bug.
    const withSink = attributePrinciples({ ...base, ...IMMEDIATE }, []);
    const without = attributePrinciples({ ...base, ...IMMEDIATE });
    expect(without.map((f) => f.id)).toEqual(withSink.map((f) => f.id));
  });

  it('is non-vacuous: the fixture really does reach the detectors', () => {
    // An early bail-out would produce an empty `why` and pass every "not
    // toMatch" above for free.
    const why = whyFor(IMMEDIATE);
    expect(why.length).toBeGreaterThan(80);
    expect(why, 'a bail-out means the detectors never ran').not.toMatch(/^attribution: /);
  });
});
