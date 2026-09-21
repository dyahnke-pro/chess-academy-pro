/**
 * T5 — a fork TWO moves away can open the door on a live board.
 *
 * 🔴 THE GAP (David 2026-09-21: "the algo should decide when a tactic gets
 * mentioned. If it cannot call a tactic two moves away we need to add that
 * capability. But algo/heatmap/decision computer all come together to decide
 * when something is spoken").
 *
 * `detectLatentFork` — David's own 2026-09-16 ask, "pieces on forkable squares"
 * — was computed on every position and spoke as a FACT, but was missing from
 * the `standingDanger` disjunction that reaches `judgeMoment`. On `walk` that
 * is invisible: every ply speaks anyway. On `interrupt`, where silence is the
 * default and the moment must EARN voice, it meant a two-move fork could be
 * computed, be true, and never make the ply speak — the detector decided WHAT
 * was said once a ply had earned voice, and never WHETHER.
 *
 * That is the shape T5 described: "on `interrupt` posture a two-move fork does
 * not open the door by itself; the count only decides WHAT is said once the ply
 * speaks."
 *
 * 🚨 THIS ASSERTS THE WIRE, NOT A VERDICT. Whether any particular board has a
 * latent fork is the detector's business and its four gates will keep moving.
 * What must never come back is the signal being unable to reach the decision at
 * all — so the test feeds the signal directly and checks the door.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { judgeMoment } from '../services/coachDecider';
import type { ImportanceSignals } from '../services/narrationImportance';

/** A quiet, settled position: nothing the ENGINE signals can see. */
const QUIET: ImportanceSignals = {
  decision: null,
  cpLossCp: null,
  threatNet: 0,
  teachingBeat: false,
  evalCpWhitePov: 20,
  wdl: [330, 340, 330],
};

describe('T5 — the two-move fork reaches the decision', () => {
  it('a quiet position stays SILENT on interrupt (the control)', () => {
    // Without this, the test below would prove nothing: if everything spoke on
    // interrupt, "it speaks" would not be evidence that the signal arrived.
    expect(judgeMoment(QUIET, 1500, 'interrupt').speaks).toBe(false);
  });

  it('the SAME position with a standing danger DOES open the door', () => {
    expect(judgeMoment({ ...QUIET, standingDanger: true }, 1500, 'interrupt').speaks).toBe(true);
  });

  it('walk speaks either way — the posture, not the signal, decides there', () => {
    expect(judgeMoment(QUIET, 1500, 'walk').speaks).toBe(true);
    expect(judgeMoment({ ...QUIET, standingDanger: true }, 1500, 'walk').speaks).toBe(true);
  });

  it('positionFacts routes latentFork INTO that channel', () => {
    // The wire itself, asserted by statement rather than by behaviour: the
    // disjunction that feeds judgeMoment must name latentFork. A behavioural
    // test here would need a real position whose fork survives all four gates,
    // which pins the DETECTOR's tuning rather than the wiring this is about.
    const src = readFileSync(resolve(__dirname, '../services/positionFacts.ts'), 'utf8');
    const line = src.split('\n').find((l) => l.includes('const standingDanger =')) ?? '';
    expect(line, 'standingDanger no longer parsed — this gate is vacuous').toContain('latentDanger');
    expect(line, 'latentFork cannot reach judgeMoment').toContain('latentFork');
  });
});
