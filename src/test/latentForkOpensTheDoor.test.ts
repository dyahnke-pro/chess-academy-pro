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
    expect(judgeMoment(QUIET, 'interrupt').speaks).toBe(false);
  });

  it('the SAME position with a standing danger DOES open the door', () => {
    expect(judgeMoment({ ...QUIET, standingDanger: true }, 'interrupt').speaks).toBe(true);
  });

  it('walk speaks either way — the posture, not the signal, decides there', () => {
    expect(judgeMoment(QUIET, 'walk').speaks).toBe(true);
    expect(judgeMoment({ ...QUIET, standingDanger: true }, 'walk').speaks).toBe(true);
  });

  it('the STUDENT\'s own fork opens the door too — but never as must-defend', () => {
    // T5's capability, in the register it belongs to. Both halves matter: the
    // first proves the algo (not the model) can raise a tactic two moves out;
    // the second is the correction of my own first attempt, which routed this
    // through `standingDanger` and so told the student a fork THEY could play
    // was "a standing danger on the board" at tier must-defend.
    const v = judgeMoment({ ...QUIET, standingChance: true }, 'interrupt');
    expect(v.speaks, 'a fork the student can set up must be able to earn voice').toBe(true);
    expect(v.importance.tier, 'an opportunity is a teaching beat, never a defensive obligation')
      .toBe('teaching');
    expect(v.importance.reasons.join(' ')).not.toContain('standing danger');
  });

  it('a chance in a DECIDED game stays quiet; a danger does not', () => {
    // The asymmetry is deliberate and is the reason these are two signals.
    // A fork you could set up in a game already won is not worth stopping for;
    // a pin in waiting still loses you the piece.
    const DECIDED: ImportanceSignals = { ...QUIET, evalCpWhitePov: 900, wdl: [980, 15, 5] };
    expect(judgeMoment({ ...DECIDED, standingChance: true }, 'interrupt').speaks).toBe(false);
    expect(judgeMoment({ ...DECIDED, standingDanger: true }, 'interrupt').speaks).toBe(true);
  });

  it('positionFacts routes EACH SEAT to its own channel', () => {
    // 🔴 THE GATE THIS REPLACES asserted only that `standingDanger` mentioned
    // `latentFork` — which the seat-blind version satisfied, and which the
    // corrected version ALSO satisfies by substring (`latentForkTheirs`). It
    // would have passed on both, so it could never have caught the bug it was
    // written for. Measured before the fix: 83.4% of the plies the signal
    // opened were the student's own opportunity filed as a threat.
    const src = readFileSync(resolve(__dirname, '../services/positionFacts.ts'), 'utf8');
    const lines = src.split('\n');
    const danger = lines.find((l) => l.includes('const standingDanger =')) ?? '';
    const chance = lines.find((l) => l.includes('const standingChance =')) ?? '';
    expect(danger, 'standingDanger no longer parsed — this gate is vacuous').toContain('latentDanger');
    expect(danger, 'the OPPONENT\'s fork is a danger and must reach that channel')
      .toContain('latentForkTheirs');
    expect(danger, 'the student\'s OWN fork must never be a must-defend danger')
      .not.toContain('latentForkMine');
    expect(chance, 'the student\'s own fork must reach the chance channel')
      .toContain('latentForkMine');
  });

  it('the clause KIND follows the seat, so the tie-break and the weakness join agree', () => {
    // Three consumers read this kind: the `incoming` tie-break, matchClauseKind,
    // and any audit grouping by kind. One root, so one assertion.
    const src = readFileSync(resolve(__dirname, '../services/positionFacts.ts'), 'utf8');
    expect(src, 'the fork clause must pick its kind from the seat')
      .toMatch(/latentFork\.forker === studentSeat \? 'latent-chance' : 'latent-danger'/);
  });
});
