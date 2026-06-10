import { describe, it, expect } from 'vitest';
import { isTacticsQuestion, isProgressQuestion, isMasterPlayQuestion, isConceptQuestion, isPlayerGamesQuestion, isEndgameQuestion, isPositionAssessmentQuestion } from './coachService';

// Grounding inversion STEP B (2026-06-10). These detectors route a chat turn to
// a CODE fact-computer (assembleTacticsAnswer / assembleProgressAnswer) so the
// LLM only voices the result — it decides nothing. The regexes must FIRE on the
// real phrasings but NOT on ordinary chat (a false positive sends a turn down
// the grounded path unnecessarily; a false negative leaves it in the LLM swamp).
describe('isTacticsQuestion', () => {
  it('matches tactics / danger phrasings', () => {
    for (const q of [
      'is anything hanging?',
      "what's the threat here?",
      'any threats?',
      'is there a fork?',
      'am I in danger?',
      'is my queen safe?',
      'is the knight hanging?',
      'can I be punished for this?',
      'is there a mate here?',
      'are there any tactics?',
      'is my rook under attack?',
    ]) {
      expect(isTacticsQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match ordinary chat / non-tactics questions', () => {
    for (const q of [
      'what opening is this?',
      'tell me about the Caro-Kann',
      'what should I name my repertoire?',
      'how many games have I played?',
      undefined,
      '',
    ]) {
      expect(isTacticsQuestion(q), String(q)).toBe(false);
    }
  });
});

describe('isProgressQuestion', () => {
  it('matches student-progress phrasings', () => {
    for (const q of [
      'am I improving?',
      'am I getting better?',
      'how am I doing?',
      'what should I work on?',
      'what do I need to improve?',
      'what are my weaknesses?',
      'what are my weak spots?',
      'what are my bad habits?',
      'how is my progress?',
      "what's holding me back?",
      'what is my biggest weakness?',
    ]) {
      expect(isProgressQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match ordinary chat / position questions', () => {
    for (const q of [
      "what's the best move?",
      'is anything hanging?',
      'tell me about the Italian Game',
      'who is the best player ever?',
      undefined,
      '',
    ]) {
      expect(isProgressQuestion(q), String(q)).toBe(false);
    }
  });
});

describe('isMasterPlayQuestion', () => {
  it('matches master-practice / popularity phrasings', () => {
    for (const q of [
      'how do masters play this?',
      'what do grandmasters play here?',
      'what do the pros prefer?',
      "what's the most popular move?",
      'most common continuation here',
      "what's the main line?",
      'what do the books say?',
      'how do GMs continue?',
    ]) {
      expect(isMasterPlayQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match ordinary chat / non-master questions', () => {
    for (const q of [
      "what's the best move?",   // engine best-move, not master practice
      'is anything hanging?',
      'am I improving?',
      'tell me about the Italian Game',
      undefined,
      '',
    ]) {
      expect(isMasterPlayQuestion(q), String(q)).toBe(false);
    }
  });
});

describe('isConceptQuestion', () => {
  it('matches definitional phrasings', () => {
    for (const q of [
      "what's a fork?",
      'what is a zwischenzug',
      'explain zugzwang',
      'define the Lucena position',
      'what does en passant mean',
      'tell me about the bishop pair',
      'how does a skewer work',
    ]) {
      expect(isConceptQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match position-specific questions (no collision with tactics/best-move)', () => {
    for (const q of [
      'is there a fork here?',
      'is anything hanging?',
      "what's the best move?",
      'what should I play here',
      'am I in danger right now',
      undefined,
      '',
    ]) {
      expect(isConceptQuestion(q), String(q)).toBe(false);
    }
  });
});

describe('isPlayerGamesQuestion', () => {
  it('matches pro-game phrasings', () => {
    for (const q of [
      'how does Naroditsky play this?',
      'how does he handle the Caro?',
      "show me his games here",
      "show me Naroditsky's games",
      'what does the pro do here',
      "what are Hikaru's games in this line",
    ]) {
      expect(isPlayerGamesQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match aggregate master-play or generic questions', () => {
    for (const q of [
      'how do masters play this?', // aggregate → isMasterPlayQuestion, not pro-games
      "what's the best move?",
      'is anything hanging?',
      undefined,
      '',
    ]) {
      expect(isPlayerGamesQuestion(q), String(q)).toBe(false);
    }
  });
});

describe('isEndgameQuestion', () => {
  it('matches endgame-verdict phrasings', () => {
    for (const q of [
      'can I win this endgame?',
      'is this a draw?',
      'can I hold this?',
      'how do I win this',
      'is this theoretically winning',
      'what does the tablebase say',
    ]) {
      expect(isEndgameQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match plain non-endgame questions', () => {
    for (const q of [
      'tell me about the Italian Game',
      'what should I name my repertoire',
      undefined,
      '',
    ]) {
      expect(isEndgameQuestion(q), String(q)).toBe(false);
    }
  });
});

describe('isPositionAssessmentQuestion', () => {
  it('matches position-assessment phrasings', () => {
    for (const q of [
      "who's winning?",
      'who is better here',
      "what's the eval?",
      'am I better or worse',
      'is this position good for me',
      'where do I stand',
      "how's my position",
      'assess this position',
      'evaluate the position',
      "what's going on here",
    ]) {
      expect(isPositionAssessmentQuestion(q), q).toBe(true);
    }
  });

  it('does NOT swallow progress, best-move, or tactics questions', () => {
    for (const q of [
      'am I improving?',        // progress (student over time)
      'what should I play?',     // best-move
      'is anything hanging?',    // tactics
      'tell me about the Caro',  // opening chat
      undefined,
      '',
    ]) {
      expect(isPositionAssessmentQuestion(q), String(q)).toBe(false);
    }
  });
});
