// The book-move rule on the review walk (unified-coach N2, CLAUDE.md "NARRATION
// IS SELECTED BY THE STUDENT'S COMPUTED NEED"): the quiet per-move opening
// teaching speaks for a COLD student (the prior) and goes SILENT on a line this
// student has already played right five times — and every student ply carries
// its need verdict so the prod audit can measure coverage against need instead
// of counting sentences (the retired R2).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent, FAMILIAR_REPS, type StudentNeedContext } from './needScore';

// A quiet Giuoco Pianissimo — no captures, no checks, no shape-changing pushes,
// so the only opening narration available is the per-move teaching beat.
const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'c3', 'Nf6', 'O-O', 'O-O', 'Re1', 'a6', 'Bb3', 'Ba7'];

function inputs(): ReviewMoveInput[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    const mv = c.move(san);
    if (!mv) throw new Error(`bad fixture san ${san}`);
    return {
      ply: i + 1, san: mv.san, isCoachMove: false, classification: 'book' as const,
      evaluation: 20, preMoveEval: 20, bestMove: null, fenAfter: c.fen(),
    };
  });
}

describe('review need gate (N2)', () => {
  it('a COLD student hears the opening taught — every student ply carries a need verdict that cleared on the prior', () => {
    const segs = buildReviewSegments(inputs(), 'white', 'Italian Game', false, 1400, [], coldStudent(1400));
    const student = segs.filter((s) => s.playerColor === 'white');
    expect(student.length).toBeGreaterThan(0);
    for (const s of student) {
      expect(s.need, `ply ${s.ply} has a need verdict`).toBeDefined();
      expect(s.need!.speak).toBe(true);
      expect(s.need!.prior).toBe(true);
    }
    expect(student.some((s) => s.narration !== null)).toBe(true);
  });

  it('a MASTERED line (five correct reps, warm profile, no holes) is silent on the quiet plies', () => {
    const familiar: StudentNeedContext = {
      rating: 1400, gamesPlayed: 30, signals: [], bookDepartures: [], capabilities: new Map(),
      lineReps: new Array(SANS.length).fill(FAMILIAR_REPS),
    };
    const cold = buildReviewSegments(inputs(), 'white', 'Italian Game', false, 1400, [], coldStudent(1400));
    const warm = buildReviewSegments(inputs(), 'white', 'Italian Game', false, 1400, [], familiar);
    const warmStudent = warm.filter((s) => s.playerColor === 'white');
    for (const s of warmStudent) expect(s.need!.speak, `ply ${s.ply}`).toBe(false);
    // No quiet per-move teaching fired where need said silent…
    expect(warmStudent.filter((s) => s.narrationSource === 'per-move')).toHaveLength(0);
    // …and the cold walk said strictly more than the warm one.
    const said = (segs: ReturnType<typeof buildReviewSegments>): number => segs.filter((s) => s.playerColor === 'white' && s.narration).length;
    expect(said(cold)).toBeGreaterThan(said(warm));
  });

  it('opponent plies never carry a need verdict', () => {
    const segs = buildReviewSegments(inputs(), 'white', 'Italian Game', false, 1400, [], coldStudent(1400));
    for (const s of segs.filter((x) => x.playerColor === 'black')) expect(s.need).toBeUndefined();
  });

  it('with no student context at all (legacy callers) the walk behaves as a cold student — never mute', () => {
    const segs = buildReviewSegments(inputs(), 'white', 'Italian Game', false, 1400);
    const student = segs.filter((s) => s.playerColor === 'white');
    expect(student.every((s) => s.need?.speak === true)).toBe(true);
  });
});

// 🔒 THE DEFAULT PATH. `isReviewUncapped()` returns TRUE on prod, so the branch
// a real review runs is the full-data aggregator — and until 2026-09-15 the
// gate above sat only on the capped cascade, so every one of these assertions
// was green while the shipping review still narrated every quiet book ply.
// A gate that only covers the path nobody runs is not a gate.
describe('review need gate (N2) — the UNCAPPED path prod actually runs', () => {
  const familiar: StudentNeedContext = {
    rating: 1400, gamesPlayed: 40, signals: [], bookDepartures: [], capabilities: new Map(),
    lineReps: new Array(SANS.length + 2).fill(FAMILIAR_REPS),
  };
  it('a mastered line goes quiet on the student\'s own book plies', () => {
    const cold = buildReviewSegments(inputs(), 'white', 'Italian Game', true, 1400, [], coldStudent(1400));
    const warm = buildReviewSegments(inputs(), 'white', 'Italian Game', true, 1400, [], familiar);
    const spokenStudent = (segs: ReturnType<typeof buildReviewSegments>): number =>
      segs.filter((s) => s.playerColor === 'white' && s.narration).length;
    expect(spokenStudent(cold)).toBeGreaterThan(0);
    expect(spokenStudent(warm)).toBeLessThan(spokenStudent(cold));
  });
  it('the OPPONENT\'s plies are never silenced by the student\'s need', () => {
    const warm = buildReviewSegments(inputs(), 'white', 'Italian Game', true, 1400, [], familiar);
    const opp = warm.filter((s) => s.playerColor === 'black');
    expect(opp.some((s) => s.narration)).toBe(true);
    expect(opp.every((s) => s.need === undefined)).toBe(true);
  });
  it('a silenced ply reports no narration SOURCE, so the audit\'s leak check can see it', () => {
    const warm = buildReviewSegments(inputs(), 'white', 'Italian Game', true, 1400, [], familiar);
    for (const s of warm) {
      if (s.need && !s.need.speak && s.playerColor === 'white') expect(s.narrationSource).toBeNull();
    }
  });
});
