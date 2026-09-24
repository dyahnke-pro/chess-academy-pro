/**
 * EVERY ALGO DECISION IS OBSERVABLE — the gate behind David's 2026-09-20
 * standing order, "I want audit tools on all algo based builds".
 *
 * `coachDecider.decide()` is the ONE door everything the coach says passes
 * through, and it used to emit nothing at all: no `logAppAudit`, no analytics,
 * on any path. So the weighting could only be judged by reading narration —
 * which is how every real defect of that day was found, and which notices
 * nothing when a term's contribution drifts or the floor starts sweeping facts
 * that should have spoken.
 *
 * Two halves, and the second is the one that keeps this honest:
 *  1. every RETURN PATH emits (asserted behaviourally, below);
 *  2. the emission is BLAMED BY STATEMENT in the source, so a new branch that
 *     returns a decision without emitting fails here rather than shipping a
 *     silent path. Comments mentioning `return` never count — the same
 *     blame-by-statement discipline the perspective and corpus gates use.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { decide } from './coachDecider';
import { onCoachDecision, onNeedScore, resetCoachDecisionListeners, type CoachDecisionRow, type NeedScoreRow } from './coachDecisionEvents';
import { computeNeed, coldStudent } from './needScore';

const rows: CoachDecisionRow[] = [];
let off: (() => void) | null = null;

beforeEach(() => {
  rows.length = 0;
  resetCoachDecisionListeners();
  off = onCoachDecision((r) => rows.push(r));
});
afterEach(() => { off?.(); resetCoachDecisionListeners(); });

/** A quiet position: nothing hinges, so `judgeMoment` closes the door on an
 *  'interrupt' surface. */
const quietSignals = { cpLoss: 0, gapCp: 0, contested: false } as never;
/** A real blunder, so the moment itself earns voice. */
const loudSignals = { cpLoss: 400, gapCp: 400, contested: true } as never;
const student = (need: { speak: boolean } | null) =>
  ({ rating: 1500, weaknesses: [], need, layers: { safety: 'grey', principle: 'grey', plan: 'grey' } } as never);
const bundle = (facts: string[]) => ({ facts, squares: new Map(), alreadySaid: new Set<string>() } as never);

describe('every decision path is observable', () => {
  it('emits when IMPORTANCE closes the door', () => {
    const d = decide(quietSignals, student(null), bundle(['[delta] a quiet move']), 'interrupt');
    expect(d.speak).toBe(false);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ posture: 'interrupt', speak: false, reason: 'importance' });
  });

  it('emits when NEED closes the door, and says which gate it was', () => {
    const d = decide(loudSignals, student({ speak: false }), bundle(['[delta] something']), 'walk');
    expect(d.speak).toBe(false);
    expect(rows).toHaveLength(1);
    // The two silences are DIFFERENT diagnoses; collapsing them is how a
    // posture bug hides behind a need bug.
    expect(rows[0].reason).toBe('need');
    expect(rows[0].needSpeak).toBe(false);
  });

  it('emits when the coach SPEAKS, with the counts an audit can trend', () => {
    const d = decide(loudSignals, student({ speak: true }), bundle(['[threat] one', '[delta] two']), 'walk');
    expect(d.speak).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ speak: true, reason: 'spoken' });
    expect(rows[0].spokenCount + rows[0].quietCount).toBeGreaterThan(0);
  });

  it('emits when every fact was an unsupported description, and names that gate', () => {
    // TEACHING POINTS FIRST (2026-09-23): a ply of descriptions with no
    // teaching point says nothing — a third silence, distinct from the two above.
    const d = decide(loudSignals, student({ speak: true }), bundle(['[delta] one', '[delta] two']), 'walk');
    expect(d.speak).toBe(false);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ speak: false, reason: 'unsupported' });
  });

  it('an EMPTY bundle names its own gate, not unsupported (walk 6, D1)', () => {
    const d = decide(loudSignals, student({ speak: true }), bundle([]), 'walk');
    expect(d.speak).toBe(false);
    expect(rows[0]).toMatchObject({ speak: false, reason: 'empty' });
  });

  it('absent need is recorded as ABSENT, never as false', () => {
    // Absent need reads as SPEAK by the cold-start rule, so an audit must be
    // able to tell "no data" from "the student did not need it".
    decide(loudSignals, student(null), bundle(['[delta] one']), 'walk');
    expect(rows[0].needSpeak).toBeNull();
  });

  it('telemetry can never break the coach', () => {
    resetCoachDecisionListeners();
    onCoachDecision(() => { throw new Error('listener blew up'); });
    expect(() => decide(loudSignals, student({ speak: true }), bundle(['[delta] one']), 'walk')).not.toThrow();
  });

  it('BLAMES BY STATEMENT: no return path escapes the emitter', () => {
    const src = readFileSync('src/services/coachDecider.ts', 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    // Inside decide(): every `return {` that builds a CoachDecision must be
    // wrapped by emit(). Any bare one is a silent path.
    const body = src.slice(src.indexOf('export function decide('));
    const bare = [...body.matchAll(/return \{ \.\.\.base/g)];
    expect(bare, 'a decision returned without emitting — nobody can audit that path').toHaveLength(0);
  });
});

/**
 * THE NEED SCORE'S PER-TERM BREAKDOWN — the second algo emission (OWED #1 of
 * the rule's list, built 2026-09-20). `decide()` receives the need VERDICT and
 * never the score, so the only honest place for the score is inside
 * `computeNeed`; this proves it fires there with every term named.
 */
describe('computeNeed emits its per-term breakdown', () => {
  const needRows: NeedScoreRow[] = [];
  let offNeed: (() => void) | null = null;
  beforeEach(() => { needRows.length = 0; resetCoachDecisionListeners(); offNeed = onNeedScore((r) => needRows.push(r)); });
  afterEach(() => { offNeed?.(); resetCoachDecisionListeners(); });

  it('names every term, including the ones that did not fire', () => {
    computeNeed({ ply: 7, studentMove: true, clauseKind: null, fundamentalId: null }, coldStudent(1500));
    expect(needRows).toHaveLength(1);
    // A term missing from the record is indistinguishable from a term scoring
    // zero, and those are different facts — the first is a wiring bug.
    for (const t of ['departure', 'weakness', 'unfamiliarity', 'resultDeficit', 'capability', 'thread']) {
      expect(Object.keys(needRows[0].terms), `the ${t} term is not in the emission`).toContain(t);
    }
  });

  it('the emitted score and verdict are the ones the caller got', () => {
    const v = computeNeed({ ply: 3, studentMove: true, clauseKind: null, fundamentalId: null, onThread: true }, coldStudent(1500));
    expect(needRows[0].score).toBe(v.score);
    expect(needRows[0].speak).toBe(v.speak);
    expect(needRows[0].prior).toBe(v.prior);
    expect(needRows[0].terms.thread).toBe(35);
  });

  it('an opponent ply emits nothing — need is only ever computed for the student', () => {
    computeNeed({ ply: 4, studentMove: false, clauseKind: null, fundamentalId: null }, coldStudent(1500));
    expect(needRows).toHaveLength(0);
  });

  it('a throwing listener never reaches the caller', () => {
    onNeedScore(() => { throw new Error('telemetry blew up'); });
    expect(() => computeNeed({ ply: 2, studentMove: true, clauseKind: null, fundamentalId: null }, coldStudent(1500))).not.toThrow();
  });
});
