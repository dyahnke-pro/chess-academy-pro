/**
 * ONE definition of "endgame" across the coach.
 *
 * "How do I win this ending?" trips BOTH `isPlanQuestion` and
 * `isEndgameQuestion`, and the plan lane is dispatched ~250 lines ahead of the
 * endgame lane in `coachApi`, so it always won. The BOARD decides which lane
 * owns the turn — and it must decide with the app's canonical predicate, not a
 * piece count. A count disagrees with `isEndgameByMaterial` on exactly the
 * positions that matter: 18 men with the queens traded IS an ending, 14 men with
 * both queens on is NOT.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isEndgameByMaterial } from './gamePhaseService';
import { isEndgameQuestion, isPlanQuestion } from '../coach/questionIntents';

const COACH_API = readFileSync(join(process.cwd(), 'src/services/coachApi.ts'), 'utf8');

describe('the endgame/plan lane collision', () => {
  it('is real: these phrasings trip BOTH detectors', () => {
    for (const ask of ['how do I win this ending?', 'how do I win this endgame?']) {
      expect(isEndgameQuestion(ask), ask).toBe(true);
      expect(isPlanQuestion(ask), ask).toBe(true);
    }
  });

  it('but a bare plan ask must NOT be diverted — guarding on phrasing alone is the wrong fix', () => {
    // "how do I win this?" trips isEndgameQuestion too. If the deferral keyed on
    // the phrasing, this extremely common middlegame ask would be answered
    // "we're not in an endgame yet" instead of given a plan.
    expect(isEndgameQuestion('how do I win this?')).toBe(true);
  });
});

describe('isEndgameByMaterial is the one predicate', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('the start position is not an ending', () => {
    expect(isEndgameByMaterial(START)).toBe(false);
  });

  it('disagrees with a piece COUNT where it matters — queens off, 18 men', () => {
    // R+B+N+6P a side, no queens: an ending by material, 18 men on the board.
    const queenlessButFull = 'r1b2rk1/pppp1ppp/2n5/8/8/2N5/PPPP1PPP/R1B2RK1 w - - 0 20';
    const men = (queenlessButFull.split(' ')[0].match(/[a-zA-Z]/g) ?? []).length;
    expect(men).toBeGreaterThan(16);       // a count says "not an endgame"
    expect(isEndgameByMaterial(queenlessButFull)).toBe(true); // the predicate says it is
  });

  it('and the other way — few men, queens still on', () => {
    const fewMenWithQueens = '3qk2r/4pppp/8/8/8/8/4PPPP/3QK2R w Kk - 0 30';
    const men = (fewMenWithQueens.split(' ')[0].match(/[a-zA-Z]/g) ?? []).length;
    expect(men).toBeLessThanOrEqual(16);   // a count says "endgame"
    expect(isEndgameByMaterial(fewMenWithQueens)).toBe(false);
  });
});

describe('coachApi uses that predicate, not a second one', () => {
  it('the plan lane defers on the canonical predicate', () => {
    expect(COACH_API).toContain('const deferToEndgameLane =');
    expect(COACH_API).toMatch(/boardIsAnEnding = [^;]*isEndgameByMaterial/);
  });

  it('the endgame lane no longer branches on a raw piece count', () => {
    // The old `if (pieceCount > 16)` was the second definition. The count may
    // still be SPOKEN (it is the number in the sentence) but must not decide.
    expect(COACH_API).not.toMatch(/if\s*\(\s*pieceCount\s*>\s*16\s*\)/);
  });
});
