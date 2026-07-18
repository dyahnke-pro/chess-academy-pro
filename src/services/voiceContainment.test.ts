import { describe, it, expect } from 'vitest';
import {
  introducedChessTerms,
  sentenceCount,
  sentenceBudgetExceeded,
  stripUngroundedDefinitions,
  containmentCheck,
  squaresIn,
  conceptsIn,
} from './voiceContainment';

describe('voiceContainment — the "nothing added" net (Phase 0a)', () => {
  describe('the tangent David saw (the motivating bug)', () => {
    const facts =
      'Your tactical strength is strongest in forks: 12 of your last 20 puzzle wins were fork patterns. ' +
      'Your weakest theme is back rank defense at 40%.';

    it('a knight-fork DEFINITION tangent is stripped, the real answer survives', () => {
      const out =
        'Your forks are clearly your sharpest weapon — 12 of your last 20 puzzle wins used them. ' +
        'A knight fork is when a knight attacks two pieces at once. ' +
        'Back rank defense is the one to work on, at 40%.';
      const verdict = containmentCheck(facts, out);
      expect(verdict.text).not.toBeNull();
      expect(verdict.text).not.toMatch(/attacks two pieces at once/);
      expect(verdict.text).toMatch(/sharpest weapon/);
      expect(verdict.text).toMatch(/40%/);
    });

    it('an added concept OUTSIDE definition shape still trips (serve computed prose)', () => {
      const out =
        'Your forks are strong. You should also practice the greek gift sacrifice on h7.';
      const verdict = containmentCheck(facts, out);
      expect(verdict.text).toBeNull();
      expect(verdict.violations.join(' ')).toMatch(/greek gift|h7/);
    });
  });

  describe('introducedChessTerms', () => {
    it('flags squares the facts never mention', () => {
      expect(introducedChessTerms('Best move: Nf3.', 'Play Nf3, then aim for e5 and d6.'))
        .toEqual(expect.arrayContaining(['e5', 'd6']));
    });

    it('a SAN in the facts licenses its square spoken as words (kid mode phrasing)', () => {
      expect(introducedChessTerms('Best move: Nf3.', 'The knight comes to f3.')).toEqual([]);
    });

    it('concept inflections fold (facts say fork → forks/forking allowed)', () => {
      expect(introducedChessTerms('You missed a fork.', 'You keep missing forks — forking chances slip by.'))
        .toEqual([]);
    });

    it('faithful phrasing passes clean', () => {
      const facts = 'You won 3 of 5 games with the Caro-Kann. Your accuracy was 84.';
      expect(introducedChessTerms(facts, 'Three wins out of five with the Caro-Kann, at 84 accuracy — solid.'))
        .toEqual([]);
    });
  });

  describe('sentence budget', () => {
    it('counts sentences without splitting decimals', () => {
      expect(sentenceCount('That swing cost 2.5 pawns. The rest held.')).toBe(2);
      expect(sentenceCount('One line no punctuation')).toBe(1);
      expect(sentenceCount('')).toBe(0);
    });

    it('catches a contentless padding ramble', () => {
      const facts = 'You blundered once, on move 20.';
      const ramble =
        'You blundered once, on move 20. Chess is a beautiful journey. Every master was once a beginner. ' +
        'Keep practicing every day. Never give up on your dreams.';
      expect(sentenceBudgetExceeded(facts, ramble)).toBe(true);
      expect(containmentCheck(facts, ramble).text).toBeNull();
    });

    it('allows warm phrasing to split a fact across two sentences', () => {
      const facts = 'You blundered once, on move 20.';
      const warm = 'One blunder in the whole game. It came on move 20.';
      expect(sentenceBudgetExceeded(facts, warm)).toBe(false);
    });
  });

  describe('stripUngroundedDefinitions', () => {
    it('keeps a definitional sentence when the facts DO teach that concept', () => {
      const facts = 'The move lands a fork: the knight attacks king and rook.';
      const out = 'A fork is exactly what this move creates. The knight hits king and rook at once.';
      expect(stripUngroundedDefinitions(facts, out)).toBe(out);
    });

    it('the CONCEPT vertical (facts genuinely define) keeps its definition', () => {
      // assembleConceptAnswer computes real definitional prose into the facts —
      // "what is a fork" answers must not have their own definition stripped.
      const facts = 'A fork happens when one piece attacks two enemy pieces at the same time. Knights are the classic forking piece.';
      const out = 'A fork is when one piece attacks two enemy pieces at once — and knights are the classic culprits.';
      expect(stripUngroundedDefinitions(facts, out)).toBe(out);
      expect(containmentCheck(facts, out).text).toBe(out);
    });

    it('returns text unchanged when no definitional shapes exist', () => {
      const facts = 'Accuracy 91.';
      const out = 'Ninety-one accuracy — clean game.';
      expect(stripUngroundedDefinitions(facts, out)).toBe(out);
    });
  });

  describe('helpers', () => {
    it('squaresIn finds standalone and SAN-embedded squares', () => {
      const s = squaresIn('After Nf3 and exd5, the weak square is c7.');
      expect(s.has('f3')).toBe(true);
      expect(s.has('d5')).toBe(true);
      expect(s.has('c7')).toBe(true);
      expect(s.has('a1')).toBe(false);
    });

    it('conceptsIn matches phrases across hyphen/space variants', () => {
      expect(conceptsIn('a back-rank weakness').has('back rank')).toBe(true);
      expect(conceptsIn('the x-ray defense').has('x-ray')).toBe(true);
    });
  });
});
