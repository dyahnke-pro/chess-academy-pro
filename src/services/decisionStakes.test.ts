// Stakes as win chance on the decision each fact answers (WO-STORY-MATRIX-01
// P1-10, stakes.md §5–7). Each test fails on the Build 4 patch or on the code
// before P1-10b: raw face values on some facts made stakes a switch.
import { describe, it, expect } from 'vitest';
import { introHead } from '../test/introPattern';
import { Chess } from 'chess.js';
import { lessonThought, moveThoughtFacts, decisionGap } from './moveThoughtFacts';
import { newLessonVoice } from './reviewMoveBriefing';
import { captureContextsAlong } from './pvPlayback';
import { stakeValue, isStaked, stakeWc } from './factStakes';
import { wcGap } from './winChance';
import { composeThought, type ThoughtFact, NOT_LED } from './thoughtComposer';
import { NO_PROOF } from './proof';
import { LOCAL_THREAD } from './coachFact';
import type { AnalysisLine } from '../types';

const L = (moves: string[], evaluation: number): AnalysisLine => ({ rank: 1, evaluation, moves, mate: null, depth: 14 } as unknown as AnalysisLine);

function scandinavianNc3(reads: { before: AnalysisLine[]; after: AnalysisLine[]; passBefore: AnalysisLine[]; passAfter: AnalysisLine[] } | null) {
  const sans = ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'];
  const c = new Chess();
  const fens: string[] = [];
  for (const s of sans) { fens.push(c.fen()); c.move(s); }
  return {
    theory: true, tense: 'now' as const,
    fenBefore: fens[4], san: 'Nc3', prev: captureContextsAlong(fens[0], sans)[4], moverIsStudent: true as const,
    line: ['Qa5', 'd4', 'Nf6'], history: sans.slice(0, 4), theirLast: { fenBefore: fens[3], san: 'Qxd5' }, reads, costCp: 0,
  };
}
const FAN = {
  before: [L(['b1c3', 'd5a5', 'd2d4'], 45), L(['g1f3', 'c8g4', 'f1e2'], 30), L(['d2d4', 'e7e5', 'g1f3'], 20)],
  after: [L(['d5a5', 'd2d4', 'g8f6'], 45)], passBefore: [], passAfter: [],
};

describe('rule 1 — one decision, one gap', () => {
  it('Nc3 against …Qd5: the move facts share one decision and its small gap; "develops with tempo" leads', () => {
    const input = scandinavianNc3(FAN);
    const facts = moveThoughtFacts({ ...input, phrases: null }).filter((f) => f.group === 'move');
    expect(facts.length).toBeGreaterThan(1);
    const g = decisionGap(input.fenBefore, 'b1c3', FAN, 0)!;
    expect(g).toBeCloseTo(wcGap(45, 30), 6);
    for (const f of facts) {
      expect(isStaked(f.stakes), f.text).toBe(true);
      if (!isStaked(f.stakes)) continue;
      expect(f.stakes.decision).toBe(`${input.fenBefore}|student`);
      // The queen's nine points are not the reason for Nc3.
      expect(stakeWc(f.stakes)).toBeLessThanOrEqual(g + 1e-9);
    }
    const said = lessonThought(input, newLessonVoice(), null);
    // Developing with tempo is the tempo idea, not the plain develop.
    expect(said).toMatch(new RegExp(`^${introHead('student', 'Nc3', 'now')}develops into the game with tempo`));
  });
  it('with no fan to measure the gap, the whole group is unmeasured — never a partial gap', () => {
    const facts = moveThoughtFacts({ ...scandinavianNc3(null), phrases: null }).filter((f) => f.group === 'move');
    expect(facts.length).toBeGreaterThan(0);
    for (const f of facts) expect(f.stakes, f.text).toEqual({ none: 'unmeasured' });
  });
  it('a move worse than the best carries what it paid', () => {
    const g = decisionGap(scandinavianNc3(FAN).fenBefore, 'g1f3', FAN, 15)!;
    expect(g).toBeCloseTo(wcGap(45, 30), 6);
  });
});

describe('stakes are win chance, not centipawns', () => {
  it('a decided game: +8 → +5 weighs less than a level game\'s pawn (0.087 < 0.091)', () => {
    const decided = wcGap(800, 500);
    const level = wcGap(0, -100);
    expect(decided).toBeCloseTo(0.087, 3);
    expect(level).toBeCloseTo(0.091, 3);
    expect(stakeValue({ points: 3, plies: 0, wc: decided })!).toBeLessThan(stakeValue({ points: 1, plies: 0, wc: level })!);
  });
});

describe('every verified find is said (David 2026-11-12: "if computers find something we speak it")', () => {
  const fact = (id: string, text: string, squares: string[], stakes: ThoughtFact['stakes'], step: ThoughtFact['step'] = 'board'): ThoughtFact => ({
    id, text, squares, stakes, step, group: 'structure', kind: 'plan-now', computer: 'moveAspects', source: 'briefing', idea: id === 'lead' ? 'plan' : 'weakness',
    weight: 50, seat: 'student', fen: '8/8/8/8/8/8/8/8 w - - 0 1', proof: NO_PROOF.description, thread: LOCAL_THREAD, namesStudentMove: false, claims: [id],
  } as unknown as ThoughtFact);
  const D = 'x|student';
  it('a fact behind the lead speaks whatever its stake, small or large (no news margin)', () => {
    const lead = fact('lead', 'The plan is the c-file.', ['c1'], { points: 1, plies: 0, wc: 0.1, decision: D });
    const small = fact('small', 'Their pawn on a7 is weak.', ['a7'], { points: 1, plies: 0, wc: 0.12, decision: D });
    const big = fact('big', 'Their queen on h4 is trapped.', ['h4'], { points: 9, plies: 0, wc: 0.4, decision: D });
    expect(composeThought([lead, small, big], 'lesson', null, NOT_LED, null).kept.map((f) => f.id).sort()).toEqual(['big', 'lead', 'small']);
  });
});
