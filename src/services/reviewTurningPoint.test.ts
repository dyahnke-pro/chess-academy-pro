import { describe, it, expect } from 'vitest';
import {
  minSwingPawns,
  turningPointCandidates,
  buildCriticalMomentQuestion,
  judgeCriticalMomentPick,
  type TurningPointSegmentLike,
  type CriticalMomentRead,
} from './reviewTurningPoint';
import { readCriticalMoment, type CriticalFanLine } from './criticalMoment';

// The end-of-review "where did this game turn?" question (David 2026-07-11).
// Candidates + the answer are COMPUTED from the eval record — the student
// self-assesses, the board grades (G0).

function seg(o: Partial<TurningPointSegmentLike> & { ply: number }): TurningPointSegmentLike {
  return {
    moveNumber: Math.ceil(o.ply / 2),
    san: 'Nf3',
    playerColor: o.ply % 2 === 1 ? 'white' : 'black',
    evalBefore: 0,
    evalAfter: 0,
    classification: null,
    ...o,
  };
}

describe('the importance model — band-free + contested (B6, 2026-09-22)', () => {
  it('a 1.2-pawn pair turns the game for every student — the bar takes no rating', () => {
    const segs = [
      seg({ ply: 9, playerColor: 'white', evalBefore: 60, evalAfter: -60 }),   // 1.2p
      seg({ ply: 15, playerColor: 'white', evalBefore: 20, evalAfter: -100 }), // 1.2p
    ];
    expect(minSwingPawns()).toBeCloseTo(1.0);
    expect(minSwingPawns.length).toBe(0);
    expect(turningPointCandidates(segs).map((c) => c.ply)).toEqual([9, 15]); // both clear 1.0
  });

  it('contested gate: a blowout that stays a blowout is NOT a turning point', () => {
    const segs = [
      // Huge RAW swing (2.5p) but both endpoints decided for White — never turned.
      seg({ ply: 7, playerColor: 'white', evalBefore: 900, evalAfter: 650 }),
      seg({ ply: 11, playerColor: 'white', evalBefore: 300, evalAfter: -50 }),  // 3.5p, real
      seg({ ply: 15, playerColor: 'black', evalBefore: -40, evalAfter: 260 }),  // 3.0p, real
    ];
    const c = turningPointCandidates(segs);
    expect(c.map((x) => x.ply)).toEqual([11, 15]); // ply 7 excluded, biggest first
  });

  it('throwing a won game IS a turning point (decided → contested is kept)', () => {
    const segs = [
      seg({ ply: 9, playerColor: 'white', evalBefore: 800, evalAfter: -200 }), // threw the win
      seg({ ply: 13, playerColor: 'white', evalBefore: -50, evalAfter: -350 }),
    ];
    expect(turningPointCandidates(segs).map((c) => c.ply)).toContain(9);
  });
});

describe('the critical moment, asked — review’s second register', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const seg = (over: Partial<TurningPointSegmentLike> = {}): TurningPointSegmentLike => ({
    ply: 21, moveNumber: 11, san: 'e4', playerColor: 'white',
    evalBefore: 0, evalAfter: 0, classification: 'good', fenBefore: START, ...over,
  });
  /** A fan the computer resolves to `count` holding moves at the default band. */
  const fanFor = (count: 1 | 2 | 3, gap = 400): CriticalFanLine[] => {
    const cps = count === 1 ? [0, -gap, -900] : count === 2 ? [0, -10, -900] : [0, -10, -20];
    return cps.map((evaluation, i) => ({ rank: i + 1, evaluation, mate: null, bound: null, moves: ['e2e4'] }));
  };
  const readAt = (count: 1 | 2 | 3, gap = 400): CriticalMomentRead =>
    readCriticalMoment({ topLines: fanFor(count, gap), moverColor: 'w', fen: START })!;

  it('asks at a ply the SWING card can never reach — a found only-move costs nothing', () => {
    const segments = [seg()];                     // evalBefore === evalAfter → zero swing
    expect(turningPointCandidates(segments)).toHaveLength(0);
    const q = buildCriticalMomentQuestion(segments, new Map([[21, readAt(1)]]), 'white');
    expect(q?.ply).toBe(21);
    expect(q?.found).toBe(true);
    expect(q?.register).toBe('credit');
    expect(q?.reveal).toContain('You found it over the board');
  });

  it('NEVER asks a student to find a move they played (\u00a7G4.5.2)', () => {
    const credit = buildCriticalMomentQuestion([seg({ san: 'e4' })], new Map([[21, readAt(1)]]), 'white');
    expect(credit?.register).toBe('credit');
    expect(credit?.question).toBeNull();
  });

  it('withholds the move in the question and names it only in the reveal', () => {
    const q = buildCriticalMomentQuestion([seg({ san: 'd4' })], new Map([[21, readAt(1)]]), 'white');
    expect(q?.register).toBe('ask');
    expect(q?.question).toContain('?');
    expect(q?.question).not.toContain('e4');
    expect(q?.reveal).toContain('e4');
    expect(q?.reveal).toContain('Only one move kept');   // the COUNT, retrospective
  });

  it('names what they actually played when their move did not hold', () => {
    const q = buildCriticalMomentQuestion([seg({ san: 'd4' })], new Map([[21, readAt(1)]]), 'white');
    expect(q?.found).toBe(false);
    expect(q?.reveal).toContain('You played d4');
    expect(q?.reveal).toContain('Only one move kept you level here, and it was e4');
  });

  it('selects by CRITICALITY — one-move before two-move, then the widest gap', () => {
    const segs = [seg({ ply: 11 }), seg({ ply: 21 }), seg({ ply: 31 })];
    const reads = new Map([[11, readAt(2)], [21, readAt(1, 300)], [31, readAt(1, 900)]]);
    expect(buildCriticalMomentQuestion(segs, reads, 'white')?.ply).toBe(31);
    // Drop the widest one-move ply → the other one-move ply still beats the fork.
    reads.delete(31);
    expect(buildCriticalMomentQuestion(segs, reads, 'white')?.ply).toBe(21);
  });

  it('never asks about the OPPONENT’s decision', () => {
    const q = buildCriticalMomentQuestion([seg({ playerColor: 'black' })], new Map([[21, readAt(1)]]), 'white');
    expect(q).toBeNull();
  });

  it('NEGATIVE CONTROL — an unresolved read asks nothing, and no reads asks nothing', () => {
    expect(buildCriticalMomentQuestion([seg()], new Map([[21, readAt(3)]]), 'white')).toBeNull();
    expect(buildCriticalMomentQuestion([seg()], new Map(), 'white')).toBeNull();
    expect(buildCriticalMomentQuestion([], new Map([[21, readAt(1)]]), 'white')).toBeNull();
  });

  it('grades a pick against the moves that actually held', () => {
    const q = buildCriticalMomentQuestion([seg()], new Map([[21, readAt(1)]]), 'white')!;
    expect(judgeCriticalMomentPick(q, 'e4')).toBe(true);
    expect(judgeCriticalMomentPick(q, 'Nf3')).toBe(false);
  });

  it('THE SWING CARD IS UNCHANGED — the new register adds, it does not retarget', () => {
    // `teachingSelector` (N1) shares `turningPointCandidates`; this pins that
    // the shared computer still returns exactly what it did before.
    const segments: TurningPointSegmentLike[] = [
      seg({ ply: 9, evalBefore: 40, evalAfter: -260, san: 'Nd2' }),
      seg({ ply: 21, evalBefore: -260, evalAfter: -110, san: 'e4' }),
      seg({ ply: 31, evalBefore: -110, evalAfter: -420, san: 'Qh5' }),
    ];
    const got = turningPointCandidates(segments);
    expect(got.map((c) => c.ply)).toEqual([31, 9]);   // biggest swing first
    expect(got[0].swingPawns).toBeCloseTo(3.1, 5);
    expect(got[1].swingPawns).toBeCloseTo(3.0, 5);
  });
});

describe('the critical moment — the three registers', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const mk = (cps: number[], moves: string[]): CriticalFanLine[] =>
    cps.map((evaluation, i) => ({ rank: i + 1, evaluation, mate: null, bound: null, moves: [moves[i]] }));
  const seg = (san: string): TurningPointSegmentLike => ({
    ply: 21, moveNumber: 11, san, playerColor: 'white',
    evalBefore: 0, evalAfter: 0, classification: 'good', fenBefore: START,
  });
  const readOne = readCriticalMoment({
    topLines: mk([0, -400, -900], ['e2e4', 'd2d4', 'g1f3']), moverColor: 'w', fen: START,
  })!;
  const readTwo = readCriticalMoment({
    topLines: mk([0, -10, -900], ['e2e4', 'd2d4', 'g1f3']), moverColor: 'w', fen: START,
  })!;

  it('the discards are real engine lines, kept apart from the holders', () => {
    expect(readOne.holdingSans).toEqual(['e4']);
    expect(readOne.discardedSans).toEqual(['d4', 'Nf3']);
    expect(readTwo.holdingSans).toEqual(['e4', 'd4']);
    expect(readTwo.discardedSans).toEqual(['Nf3']);
  });

  it('CREDIT — they held it: stated, never asked, no chips', () => {
    const q = buildCriticalMomentQuestion([seg('e4')], new Map([[21, readOne]]), 'white')!;
    expect(q.register).toBe('credit');
    expect(q.question).toBeNull();
    expect(q.choices).toEqual([]);
  });

  it('ASK — they missed the ONLY move: a real question, chips from the fan itself', () => {
    const q = buildCriticalMomentQuestion([seg('d4')], new Map([[21, readOne]]), 'white')!;
    expect(q.register).toBe('ask');
    expect(q.question).toBeTruthy();
    expect([...q.choices].sort()).toEqual(['Nf3', 'd4', 'e4']);
    // Exactly ONE chip is right — a question with two right answers is not one.
    expect(q.choices.filter((c) => judgeCriticalMomentPick(q, c))).toEqual(['e4']);
  });

  it('ASK — the chip order rotates on the ply, so the answer is not always first', () => {
    const at = (ply: number): readonly string[] =>
      buildCriticalMomentQuestion([{ ...seg('d4'), ply }], new Map([[ply, readOne]]), 'white')!.choices;
    const orders = new Set([at(21).join(), at(22).join(), at(23).join()]);
    expect(orders.size).toBeGreaterThan(1);
    expect(at(21)).toEqual(at(21));   // deterministic, never Math.random
  });

  it('NOTE — they missed a TWO-move fork: stated, because two right chips is not a question', () => {
    const q = buildCriticalMomentQuestion([seg('Nf3')], new Map([[21, readTwo]]), 'white')!;
    expect(q.register).toBe('note');
    expect(q.question).toBeNull();
    expect(q.choices).toEqual([]);
    expect(q.reveal).toContain('You played Nf3');
    expect(q.reveal).toContain('Two moves kept you level here — e4 and d4');
  });

  it('the chips always include what they actually played, even off the fan', () => {
    const q = buildCriticalMomentQuestion([seg('h3')], new Map([[21, readOne]]), 'white')!;
    expect([...q.choices].sort()).toEqual(['Nf3', 'd4', 'e4', 'h3']);
  });
});
