/**
 * The cheap pre-gate must not be stricter than the real decision.
 *
 * 🔴 THE GAP (found 2026-09-21 sweeping the computers for wiring). `positionFacts`
 * calls the decider TWICE. The real door — `decide()` — gets the student term.
 * The EARLY `judgeMoment` was called with three arguments, no student term, and
 * ITS `importance.speak` gates whether the expensive facts are even computed
 * (`computeLeansOn`, `structurePlan`).
 *
 * So a moment this student's own record would have raised never got those facts
 * COMPUTED — and `decide()`, which does see the boost, can only rank facts that
 * exist. The heat map was excluded from the gate deciding what the heat map
 * would later get to choose between.
 *
 * 🚨 WHAT THIS ASSERTS. Not a particular verdict — the boost's numbers and the
 * importance bands both move. It asserts the PROPERTY that was violated: for
 * identical signals, raising the student term must never make the door CLOSE.
 * A monotonicity check survives retuning; an expected-value check would not.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { judgeMoment } from '../services/coachDecider';
import { studentMomentBoost } from '../services/studentMomentBoost';
import type { ImportanceSignals } from '../services/narrationImportance';

/** A middling position — not obviously loud, not obviously silent. */
const SIGNALS: ImportanceSignals = {
  decision: { severity: 'medium', gapCp: 60 },
  cpLossCp: null,
  threatNet: 0,
  teachingBeat: false,
  evalCpWhitePov: 35,
  wdl: [340, 330, 330],
};

describe('the student term reaches the pre-gate', () => {
  it('raising the boost NEVER closes a door that was open', () => {
    for (const boost of [0, 5, 10, 20, 40]) {
      const base = judgeMoment(SIGNALS, 1500, 'interrupt', 0);
      const raised = judgeMoment(SIGNALS, 1500, 'interrupt', boost);
      if (base.speaks) {
        expect(raised.speaks, `boost ${boost} CLOSED a door that was open`).toBe(true);
      }
      expect(raised.importance.rank, `boost ${boost} lowered the rank`)
        .toBeGreaterThanOrEqual(base.importance.rank);
    }
  });

  it('the GREY term alone is a real, non-zero signal', () => {
    // The pre-gate can only use grey (red needs the clause→hole join, which does
    // not exist yet). If grey were always 0 the wire would be decorative.
    const grey = studentMomentBoost({ posedTags: ['hung-material'], capabilities: undefined });
    expect(grey, 'grey boost is zero — the pre-gate wire buys nothing').toBeGreaterThan(0);
  });

  it('positionFacts passes a boost to the EARLY judgeMoment', () => {
    // By statement: the early call must carry a fourth argument. A behavioural
    // test would need a full facts run with a seeded profile, which pins the
    // boost's tuning rather than the wiring this is about.
    const src = readFileSync(resolve(__dirname, '../services/positionFacts.ts'), 'utf8');
    expect(src, 'the early judgeMoment lost its student term')
      .toMatch(/\}, rating, input\.posture, preGateBoost\);/);
  });
});
