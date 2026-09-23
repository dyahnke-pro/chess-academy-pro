import { describe, it, expect } from 'vitest';
import {
  buildQuestionGrounding, retrospectiveMoveRef, isMethodQuestion, isProgressQuestion, looksLikeQuestionNotAnOpeningName,
  isOpeningProfileQuestion, stripQuestionFiller, isHintRequest,
} from './questionIntents';
import { pureBoardAspect } from '../services/boardQuestionRouter';

/**
 * THE ROUTER, PLAN §E (WO-STANDARD-01, 2026-09-22) — the DETECTOR-PRIORITY gate.
 *
 * Every phrasing here was observed on prod being answered by the WRONG lane:
 *   E1  "why was X good/bad", "what did you have in mind with X",
 *       "what should I be thinking about"  → best-move-now (3 of 3, both bundles)
 *   E2  "what is my weakest opening?"       → the progress lane's play-a-game pitch
 *   E3  "what should I learn next?"         → a 3-game 0% opening
 *   E5  "whats teh best plan for my bishp"  → the generic side plan
 *
 * Each assertion has TWO halves and both are load-bearing:
 *   • the SPECIFIC lane fires  — remove its detector and this fails
 *     (the negative control: the test cannot pass on a deleted lane);
 *   • the HIJACKING lane is FALSE — reinstate the old precedence and this fails.
 * A test that only checked "some intent fired" would pass on both bugs.
 */
const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';
const HISTORY = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nc3', 'Nf6'];
const g = (q: string) => buildQuestionGrounding(q, { fen: FEN, moveHistory: HISTORY, studentColor: 'white' });

describe('E1 — RETROSPECTIVE beats best-move-now / why-best / move-rating / candidate', () => {
  const cases: Array<[string, ReturnType<typeof retrospectiveMoveRef>]> = [
    ['why was taking on e5 good?', { kind: 'capture-on', square: 'e5' }],
    ['what did you have in mind with Bc5?', { kind: 'san', san: 'Bc5' }],
    ['why was Ke2 bad?', { kind: 'san', san: 'Ke2' }],
    ['what was wrong with Nf3?', { kind: 'san', san: 'Nf3' }],
    ['why was night c3 good', { kind: 'san', san: 'Nc3' }],
    ['what was the idea behind Bc4?', { kind: 'san', san: 'Bc4' }],
    ['why did you play Nc3', { kind: 'san', san: 'Nc3' }],
    ['was Bc5 a mistake?', { kind: 'san', san: 'Bc5' }],
    ['why was my last move bad', { kind: 'my-last' }],
    ['why was your move good?', { kind: 'coach-last' }],
    ['why was castling good?', { kind: 'san', san: 'O-O' }],
    ['how bad was Ke2', { kind: 'san', san: 'Ke2' }],
  ];
  for (const [q, ref] of cases) {
    it(`"${q}" → retrospective(${JSON.stringify(ref)}), never best-move-now`, () => {
      expect(retrospectiveMoveRef(q)).toEqual(ref);
      const r = g(q);
      expect(r.retrospectiveMoveQuestion).toBe(true);
      expect(r.retrospectiveMoveRef).toEqual(ref);
      expect(r.bestMoveQuestion).toBeFalsy();
      expect(r.whyBestMoveQuestion).toBeFalsy();
      expect(r.moveRatingQuestion).toBeFalsy();
      expect(r.candidateMoveQuestion).toBeFalsy();
    });
  }

  const notRetro = [
    'why is Nf3 good here?',          // present tense — a candidate ask
    'why is that the best move?',     // the engine-reasoning walk
    'what does it do',                // move-purpose, not a verdict
    'why did they play that',         // the opponent-move lane
    'was that a draw',                // no verdict word
  ];
  for (const q of notRetro) {
    it(`does NOT fire retrospective on "${q}"`, () => {
      expect(retrospectiveMoveRef(q)).toBeNull();
    });
  }
  it('"why is that the best move?" still reaches the why-best lane', () => {
    expect(g('why is that the best move?').whyBestMoveQuestion).toBe(true);
  });
  it('"why is Nf3 good here?" (present tense) is NOT retrospective — the why-best lane keeps it', () => {
    const r = g('why is Nf3 good here?');
    expect(r.retrospectiveMoveQuestion).toBe(false);
    expect(r.whyBestMoveQuestion).toBe(true);
  });
  it('"was that a good move?" (bare pointer) stays on the move-rating lane — its own contract', () => {
    const r = g('was that a good move?');
    expect(r.retrospectiveMoveQuestion).toBe(false);
    expect(r.moveRatingQuestion).toBe(true);
  });
});

describe('E1b — METHOD beats plan / best-move / teaching-method / theory', () => {
  const fires = [
    'what should I be thinking about in this position?',
    'what should I think about here',
    'how do I approach this?',
    'how should I approach this position',
    "what's the process here?",
    'how should I think here?',
    'what should I be looking for',
    'walk me through your thought process',
    'how do I decide what to play',
    'what questions should I ask myself here',
    'how do I find candidate moves here',
  ];
  for (const q of fires) {
    it(`"${q}" → method, never a WHAT-to-play lane`, () => {
      expect(isMethodQuestion(q)).toBe(true);
      const r = g(q);
      expect(r.methodQuestion).toBe(true);
      expect(r.planQuestion).toBeFalsy();
      expect(r.bestMoveQuestion).toBeFalsy();
      expect(r.teachingMethodQuestion).toBeFalsy();
      expect(r.theoryQuestion).toBeFalsy();
    });
  }
  const notMethod = ["what's my plan here?", 'what should I play?', 'how would you teach the Sicilian', 'teach me how to think about the endgame'];
  for (const q of notMethod) {
    it(`does NOT fire method on "${q}"`, () => {
      expect(isMethodQuestion(q)).toBe(false);
    });
  }
  it('"what\'s my plan here?" still reaches the plan lane', () => {
    expect(g("what's my plan here?").planQuestion).toBe(true);
  });
});

describe('E2 — "weakest opening" is the opening-profile lane, NOT progress', () => {
  const qs = ['what is my weakest opening?', "what's my weakest opening?", 'my weakest opening?', 'which opening do I botch the most', 'what opening is dragging me down'];
  for (const q of qs) {
    it(`"${q}" → openingProfile(weakest) and progress is FALSE`, () => {
      expect(isOpeningProfileQuestion(q)).toBe(true);
      expect(isProgressQuestion(q)).toBe(false);
      const r = g(q);
      expect(r.openingProfileQuestion).toBe(true);
      expect(r.openingProfileKind).toBe('weakest');
      expect(r.progressQuestion).toBe(false);
    });
  }
  it('a theme weakness ask still reaches progress', () => {
    expect(isProgressQuestion('what am I weak at in my openings')).toBe(true);
    expect(isProgressQuestion('what should I work on')).toBe(true);
  });
});

describe('E3 — "what should I learn next?" is the repertoire-gap learn-next lane', () => {
  for (const q of ['what should I learn next?', 'what to learn next?', 'what opening should I learn next']) {
    it(`"${q}" → repertoireGap(learn-next)`, () => {
      const r = g(q);
      expect(r.repertoireGapQuestion).toBe(true);
      expect(r.repertoireGapKind).toBe('learn-next');
    });
  }
});

describe('E4 — a hint ask fires the hint lane on every builder', () => {
  for (const q of ['give me a hint', 'hint?', 'a nudge please', 'point me in the right direction']) {
    it(`"${q}" → hintQuestion`, () => {
      expect(isHintRequest(q)).toBe(true);
      expect(g(q).hintQuestion).toBe(true);
    });
  }
});

describe('E5 — a piece-scoped plan is the piece-plan aspect, typo-tolerant', () => {
  const cases = [
    'whats teh best plan for my bishp on f1',
    "what's the plan for my bishop on f1",
    'what should my knigt be doing',
    'where does my rook belong',
    'plan for my queen?',
  ];
  for (const q of cases) {
    it(`"${q}" → piece-plan (on the filler-stripped ask the spine now uses)`, () => {
      const stripped = stripQuestionFiller(q);
      expect(pureBoardAspect(stripped)).toBe('piece-plan');
    });
  }
  it('typo map restores the piece words the router keys on', () => {
    expect(stripQuestionFiller('whats teh best plan for my bishp on f1')).toBe('whats the best plan for my bishop on f1');
    expect(stripQuestionFiller('my knigt')).toBe('my knight');
  });
  it('a side-wide plan stays my-plan, not piece-plan', () => {
    expect(pureBoardAspect("what's my plan here")).not.toBe('piece-plan');
  });
});

describe('Learn walk 2026-09-23 — the pointer question and the bare command', () => {
  it('"why did you play that?" is about the COACH\'s last move; "why did I play that?" about mine', () => {
    expect(retrospectiveMoveRef('why did you play that?')).toEqual({ kind: 'coach-last' });
    expect(retrospectiveMoveRef('Why did you do that')).toEqual({ kind: 'coach-last' });
    expect(retrospectiveMoveRef('why did I play that move?')).toEqual({ kind: 'my-last' });
  });
  it('a bare coach command is never an opening name', () => {
    for (const w of ['hint', 'Hint', 'help', 'undo', 'take back', 'resign', 'yes', 'thanks']) {
      expect(looksLikeQuestionNotAnOpeningName(w), w).toBe(true);
    }
    expect(looksLikeQuestionNotAnOpeningName('Vienna')).toBe(false);
    expect(looksLikeQuestionNotAnOpeningName('Caro-Kann Defense')).toBe(false);
  });
});


describe('bare-verb retrospective questions (walk 5, 2026-09-23)', () => {
  it('"why did you castle?" is the coach\'s castling move — never the best move now', async () => {
    const { retrospectiveMoveRef, isRetrospectiveMoveQuestion } = await import('./questionIntents');
    expect(retrospectiveMoveRef('why did you castle?')).toEqual({ kind: 'castle', by: 'coach' });
    expect(retrospectiveMoveRef('why did I castle')).toEqual({ kind: 'castle', by: 'student' });
    expect(retrospectiveMoveRef('why did you take?')).toEqual({ kind: 'coach-last' });
    expect(retrospectiveMoveRef('why did I trade?')).toEqual({ kind: 'my-last' });
    // A bare verb with an object is not bare — the named forms still resolve as before.
    expect(retrospectiveMoveRef('why did you take on e5?')).toEqual({ kind: 'capture-on', square: 'e5' });
    expect(isRetrospectiveMoveQuestion('why did you castle?')).toBe(true);
  });
});
