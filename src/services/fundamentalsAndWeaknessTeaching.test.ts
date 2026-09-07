import { describe, it, expect } from 'vitest';
import { isFundamentalsQuestion, fundamentalsTopicFromText, isFamousGameQuestion, famousGameFromText, isFundamentalLessonQuestion } from '../coach/questionIntents';
import { assembleFundamentalsAnswer, assembleFamousGameAnswer, assembleFundamentalLessonAnswer } from './groundedAnswer';
import { FUNDAMENTAL_LESSON } from '../data/fundamentalLessons';
import { FUNDAMENTAL_IDS } from './principleAttribution';
import { matchTrainingAidRoute } from './trainingAidRouter';

// David 2026-08-26: "it couldnt teach me basic fundamentals … it just routed me
// to the tactics page. all of this needs to be taught while in the coach tab."
// These two features must be TAUGHT in-chat, not routed away — so the tests
// prove a real answer comes OUT (a wire that does not fire is not a wire).

describe('fundamentals teaching handler', () => {
  it('recognizes fundamentals asks that had no handler before', () => {
    for (const ask of [
      'teach me basic concepts',
      'teach me the fundamentals',
      'teach me the basics',
      'what are the pieces worth',
      'how much is a knight worth',
      'opening principles',
      'basic chess strategy',
    ]) {
      expect(isFundamentalsQuestion(ask), ask).toBe(true);
    }
  });

  it('does NOT hijack opening names or single-concept lookups', () => {
    expect(isFundamentalsQuestion('teach me the Najdorf')).toBe(false);
    expect(isFundamentalsQuestion('what is a fork')).toBe(false);
    expect(isFundamentalsQuestion('teach me the Caro-Kann')).toBe(false);
    // App-surface asks stay app-help.
    expect(isFundamentalsQuestion('what does the basics tab do')).toBe(false);
  });

  it('does NOT hijack opening-scoped "basics of X" (must teach the opening)', () => {
    // "the basics of the Sicilian" is an OPENING ask, not generic fundamentals.
    expect(isFundamentalsQuestion('teach me the basics of the sicilian')).toBe(false);
    expect(isFundamentalsQuestion('show me the fundamentals of the london')).toBe(false);
    expect(isFundamentalsQuestion('principles of the caro-kann')).toBe(false);
    // …but whole-game scope stays generic.
    expect(isFundamentalsQuestion('teach me the fundamentals of chess')).toBe(true);
    expect(isFundamentalsQuestion('the basics of the game')).toBe(true);
  });

  it('scopes to the right sub-topic', () => {
    expect(fundamentalsTopicFromText('what are the pieces worth')).toBe('piece-values');
    expect(fundamentalsTopicFromText('teach me king safety')).toBe('king-safety');
    expect(fundamentalsTopicFromText('explain controlling the center')).toBe('center');
    expect(fundamentalsTopicFromText('teach me development')).toBe('development');
    expect(fundamentalsTopicFromText('teach me the fundamentals')).toBe('general');
  });

  it('assembles a grounded, sourced answer for every topic (never empty)', () => {
    for (const topic of ['general', 'piece-values', 'development', 'center', 'king-safety'] as const) {
      const ans = assembleFundamentalsAnswer(topic);
      expect(ans, topic).not.toBeNull();
      expect(ans!.facts.length).toBeGreaterThan(40);
      expect(ans!.sources.length).toBeGreaterThan(0);
      expect(ans!.sources.every((s) => s.startsWith('concept:'))).toBe(true);
    }
    // Piece values must state the canonical numbers (the load-bearing fact).
    expect(assembleFundamentalsAnswer('piece-values')!.facts).toMatch(/rook.*5|5.*rook/i);
  });

  it('links development + general to a real game to walk (the see-it hand-off)', () => {
    // development/general point at the Opera Game review; others self-hide.
    expect(assembleFundamentalsAnswer('development')!.exampleReviewId).toBe('sample-morphy-opera-1858');
    expect(assembleFundamentalsAnswer('general')!.exampleReviewId).toBe('sample-morphy-opera-1858');
    expect(assembleFundamentalsAnswer('development')!.facts).toMatch(/opera game/i);
    expect(assembleFundamentalsAnswer('piece-values')!.exampleReviewId).toBeUndefined();
    expect(assembleFundamentalsAnswer('king-safety')!.exampleReviewId).toBeUndefined();
  });
});

describe('per-fundamental lesson is TAUGHT in-chat (David 2026-09-07)', () => {
  it('fires only on a teaching frame + a specific fundamental', () => {
    expect(isFundamentalLessonQuestion('teach me not moving the same piece twice')).toBe(true);
    expect(isFundamentalLessonQuestion('why are poisoned pawns bad')).toBe(true);
    expect(isFundamentalLessonQuestion('explain the opposition')).toBe(true);
    // A bare mention on a live board is NOT a lesson request.
    expect(isFundamentalLessonQuestion('my passed pawn is strong here')).toBe(false);
    // A board-assessment question stays with the board lane, not the lesson.
    expect(isFundamentalLessonQuestion('is my attack sound')).toBe(false);
    // The generic "teach me the fundamentals" is the core-four lane, not this.
    expect(isFundamentalLessonQuestion('teach me the fundamentals')).toBe(false);
    // App-surface asks stay app-help.
    expect(isFundamentalLessonQuestion('what does the fundamentals tab do')).toBe(false);
  });

  it('does not collide with the core-four fundamentals lane', () => {
    // The generic lane and the specific lane are mutually exclusive on intent.
    expect(isFundamentalsQuestion('teach me not moving the same piece twice')).toBe(false);
    expect(isFundamentalLessonQuestion('teach me the fundamentals')).toBe(false);
  });

  it('assembles a grounded, sourced lesson for every fundamental (a wire that fires)', () => {
    for (const id of FUNDAMENTAL_IDS) {
      const ans = assembleFundamentalLessonAnswer(id);
      expect(ans, id).not.toBeNull();
      expect(ans!.facts).toBe(FUNDAMENTAL_LESSON[id].facts);
      expect(ans!.facts.length).toBeGreaterThan(180);
      expect(ans!.sources.length).toBeGreaterThan(0);
      expect(ans!.bestMoveSan, 'a lesson names no board move').toBeNull();
    }
  });
});

describe('weakness ask is TAUGHT in-chat, not drilled away', () => {
  it('a teach/tell/show framing of weaknesses bypasses the drill router → brain', () => {
    // null = fall through to the grounded brain (isProgressQuestion →
    // assembleWeaknessRecommendation → voiceFacts), i.e. taught in-chat.
    expect(matchTrainingAidRoute('teach me my weaknesses')).toBeNull();
    expect(matchTrainingAidRoute('tell me my weaknesses')).toBeNull();
    expect(matchTrainingAidRoute('show me my weak spots')).toBeNull();
    expect(matchTrainingAidRoute('go over my weaknesses')).toBeNull();
  });

  it('a genuine drill/practice imperative still routes to the drill', () => {
    expect(matchTrainingAidRoute('drill my weaknesses')?.aid).toBe('mistakes');
    expect(matchTrainingAidRoute('practice my weaknesses')?.aid).toBe('mistakes');
  });
});

describe('famous game (Opera Game / Morphy) taught from stored data', () => {
  it('recognizes the famous-game asks that used to misroute', () => {
    for (const ask of [
      'teach me the opera game',
      'show me the opera game',
      "show me morphy's games",
      "morphy's game",
      'games by paul morphy',
    ]) {
      expect(isFamousGameQuestion(ask), ask).toBe(true);
      expect(famousGameFromText(ask), ask).toBe('opera-game');
    }
  });

  it('does NOT capture real openings named after Morphy', () => {
    // These must still reach the opening resolver, not the famous-game lane.
    expect(isFamousGameQuestion('teach me the Morphy Defense')).toBe(false);
    expect(isFamousGameQuestion('teach me the Evans Gambit Morphy Attack')).toBe(false);
    expect(isFamousGameQuestion('teach me the najdorf')).toBe(false);
  });

  it('assembles a grounded answer pointing at the real review sample', () => {
    const ans = assembleFamousGameAnswer('opera-game');
    expect(ans).not.toBeNull();
    expect(ans!.facts).toMatch(/Morphy/);
    expect(ans!.facts).toMatch(/1858/);
    expect(ans!.reviewId).toBe('sample-morphy-opera-1858');
    expect(ans!.sources.length).toBeGreaterThan(0);
  });

  it('the answer carries NO live-board tactic vocabulary (survives the tactic gate)', () => {
    const facts = assembleFamousGameAnswer('opera-game')!.facts;
    // The gate strips sentences naming a tactic not on the current board. The
    // grounded history must not trip it — no checkmate/back-rank/fork/pin/etc.
    for (const banned of [/\bcheckmate\b/i, /\bback[- ]rank\b/i, /\bfork\b/i, /\bpin\b/i, /\bskewer\b/i, /\bmating\b/i]) {
      expect(banned.test(facts), `banned tactic word ${banned}`).toBe(false);
    }
  });
});
