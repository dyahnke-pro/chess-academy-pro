import { describe, it, expect } from 'vitest';
import {
  introducedChessTerms,
  sentenceCount,
  sentenceBudgetExceeded,
  stripUngroundedDefinitions,
  containmentCheck,
  containmentAudit,
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

describe('containmentAudit — the audit-only tripwire for ungrounded lanes', () => {
  it('flags squares and concepts absent from the whole prompt context', () => {
    const context = 'You are a chess coach. The student is working on the knight on c3.';
    const out = 'Look at f7 — a classic fork target, and think about zugzwang.';
    const audit = containmentAudit(context, out);
    expect(audit.introduced).toContain('f7');
    expect(audit.introduced).toContain('fork');
    expect(audit.introduced).toContain('zugzwang');
  });

  it('stays silent when every term the reply uses came from the context', () => {
    const context = 'The knight on c3 eyes the d5 outpost. A fork on d5 is possible.';
    const out = 'The knight heads for d5 — the outpost — and the fork idea follows.';
    expect(containmentAudit(context, out).introduced).toEqual([]);
  });

  it('never throws on empty inputs', () => {
    expect(containmentAudit('', '').introduced).toEqual([]);
    expect(containmentAudit('', 'e4 is strong').introduced.length).toBeGreaterThan(0);
  });
});

describe("David's 2026-08-06 iPhone session — every turn false-tripped", () => {
  it('vocabulary from the DIRECTIVES is licensed (the "trap"/"d4" trips)', () => {
    const facts = 'The student played Bc4. The coach replied Nf6. It develops the knight to f6.';
    const directives = 'When a trap is lurking mention it. The other road at the fork was d4.';
    const out = 'Your Bc4 comes out, and Black answers Nf6 — developing the knight to f6. No trap here yet, and the d4 road is still in the past.';
    // Against facts alone this trips (trap + d4 introduced)…
    expect(containmentCheck(facts, out).text).toBeNull();
    // …but the directives are code-assembled prompt too, so they license it.
    expect(containmentCheck(facts, out, directives).text).not.toBeNull();
  });

  it('warm teaching over a full fact bundle passes the proportional budget', () => {
    // 13 fact sentences → 27 spoken sentences was the exact live trip.
    const facts = Array.from({ length: 13 }, (_, i) => `Fact number ${i + 1} holds.`).join(' ');
    const out = Array.from({ length: 27 }, (_, i) => `Spoken thought ${i + 1} lands.`).join(' ');
    expect(sentenceBudgetExceeded(facts, out)).toBe(false);
  });

  it('a genuine ramble over terse facts still trips the budget', () => {
    const facts = 'You blundered once, on move 20.';
    const out = Array.from({ length: 6 }, (_, i) => `Padding sentence ${i + 1} says nothing.`).join(' ');
    expect(sentenceBudgetExceeded(facts, out)).toBe(true);
  });
});

/**
 * SENTENCE COUNTING ON CHESS PROSE (2026-09-02 audit).
 *
 * Real prod trips: `sentence-budget: 26 > 7*2+2` and `18 > 1*2+2` on review
 * turns, each discarding the house voice for raw computed prose. The output was
 * not rambling — the counter was reading every "12. Nf3" as a sentence end, so
 * warm output inflated ~2x against a budget derived from computed facts that
 * carry no move numbers (G9.4 bans them from narration). The budget had already
 * been loosened twice to compensate, on numbers this counter inflated both
 * times, and it still tripped.
 */
describe('sentenceCount — periods that are not sentence ends', () => {
  it('plain prose is unaffected', () => {
    expect(sentenceCount('You were better here. The knight was loose. Then it slipped.')).toBe(3);
  });

  it('move numbers do not end sentences', () => {
    // 3 sentences; the raw counter read 6.
    expect(sentenceCount('After 12. Nf3 Black is fine. But 14. Qd2 was the mistake. Then 15. Bf6 lost material.')).toBe(3);
  });

  it('black-move ellipses do not end sentences', () => {
    expect(sentenceCount('He answered 12... Nc6 and the tension held.')).toBe(1);
  });

  it('castling move numbers do not end sentences', () => {
    expect(sentenceCount('Then 9. O-O tucked the king away safely.')).toBe(1);
  });

  it('a numbered list counts its items, not its markers', () => {
    expect(sentenceCount('1. Develop fast.\n2. Castle early.\n3. Connect rooks.')).toBe(3);
  });

  // The strips are deliberately narrow. These prove they do not over-reach.
  it('a sentence genuinely ending in a digit still counts as two', () => {
    // No SAN after the number, so the move-number strip must NOT fire.
    expect(sentenceCount('You were up 3. Then he blundered.')).toBe(2);
  });

  it('decimal evals still do not split', () => {
    expect(sentenceCount('You were up 1.5 pawns. That is winning.')).toBe(2);
  });

  it('the budget stops firing on warm chess prose it should never have caught', () => {
    // A PV playback: one computed fact, warm phrasing that names the moves.
    // Pre-fix this counted 7 against a budget of 1*2+2=4 and was rejected.
    const facts = 'The best line was Nf3, Nc6, Bb5.';
    const warm = 'The engine wants 12. Nf3 here, developing with tempo. Black replies 12... Nc6 to hold the centre. Then 13. Bb5 pins the knight.';
    expect(sentenceBudgetExceeded(facts, warm)).toBe(false);
  });

  it('a PATHOLOGICAL ramble still trips — the gate is not defanged', () => {
    const facts = 'You are winning.';
    const ramble = Array.from({ length: 12 }, (_, i) => `Point number ${i} about the position.`).join(' ');
    expect(sentenceBudgetExceeded(facts, ramble)).toBe(true);
  });
});
