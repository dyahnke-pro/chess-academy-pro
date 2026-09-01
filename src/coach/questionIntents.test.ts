import { describe, it, expect } from 'vitest';
import { isAppHelpQuestion, isWhyBestMoveQuestion } from './questionIntents';
import {
  isAlternativesQuestion,
  isPlanQuestion,
  isBestMoveQuestion,
  isTacticsQuestion,
  isPositionAssessmentQuestion,
  isMasterPlayQuestion,
  isEndgameQuestion,
  isEndgamePlayRequest,
  isEndgameWeaknessQuestion,
  isPlayerGamesQuestion,
  isConceptQuestion,
  isProgressQuestion,
  isOpeningProfileQuestion,
  openingProfileKind,
  buildQuestionGrounding,
  isStatsQuestion,
  isStrengthsQuestion,
  isOpeningAccuracyQuestion,
  isOpeningTrapsQuestion,
  opensTrapsSystemAsk,
  isReviewDueQuestion,
  isMistakesQuestion,
  isLastGameMistakeQuestion,
  isNameOpeningQuestion,
  isOpponentMoveQuestion,
  isTheoryQuestion,
  weaknessLifecycleKind,
  isWeaknessBriefingQuestion,
  isTacticsProfileQuestion,
  isPhaseQuestion,
  isRepertoireGapQuestion,
  repertoireGapKind,
  isAccuracyQuestion,
  isConsistencyQuestion,
  isErrorsBySituationQuestion,
  isMisconceptionsQuestion,
  isConvertingQuestion,
  recordVsTarget,
  isRecordVsQuestion,
  isRecordsQuestion,
  isMoveRatingQuestion,
  isCandidateMoveQuestion,
  extractCandidateSan,
  trainingRequestKind,
  isTrainingRequest,
  isImprovementTrendQuestion,
} from './coachService';

// David 2026-06-14: "throw the thesaurus at this problem for ALL questions."
// The grounded-answer routers must recognize a question however it's worded —
// the bug that started this was "what's the weakest aspect of my game?" falling
// through (it isn't "what are my weaknesses?"). Each block below asserts a wide
// spread of phrasings routes to the right computed-fact answer; the COLLISIONS
// block guards the documented disambiguations so widening one router doesn't
// hijack another.

describe('isProgressQuestion (weakness / improvement — the thesaurus bug)', () => {
  it('matches the original phrasing that failed', () => {
    expect(isProgressQuestion('What is the weakest aspect of my game?')).toBe(true);
  });
  it.each([
    'what are my weaknesses?',
    'what is my biggest weakness?',
    "what's my weakest area?",
    'what are my weak points',
    'what is the weakest part of my game',
    "what's the weakest aspect of my play",
    'where do I struggle the most',
    'where do I keep going wrong',
    'what are my bad habits',
    'what are my recurring mistakes',
    'what should I work on',
    'what do I need to improve',
    'what should I focus on to get better',
    'what should I practice',
    'am I improving',
    'how am I doing',
    "how's my chess progress",
    "what's holding me back",
    'what trips me up',
    'what am I worst at',
    "what's my biggest leak",
    'what keeps costing me games',
    // NB: "what are my strengths" is NO LONGER a progress question — it routes to
    // the dedicated isStrengthsQuestion path (see its own describe block).
  ])('matches: %s', (q) => expect(isProgressQuestion(q)).toBe(true));

  // David 2026-07-04: the exact meta-questions that dead-ended at the picker,
  // plus the theorist's full verb/noun/predicate surface. "Fill all verbs."
  it.each([
    // David's six probe questions
    'What should I train?',
    'What should I learn next?',
    'What tactics am I weak in?',
    'What are my biggest weaknesses?',
    'What should I work on to improve my chess?',
    'Where am I losing most of my games?',
    // training verbs (recommendation frames)
    'what should I study next',
    'what should I hone',
    'what should I sharpen',
    'what should I master first',
    'what to work on next',
    'what to train',
    'what should I grind',
    "what's the best thing to work on",
    'what should I be working on',
    'help me improve',
    'help me get better',
    'tell me what to train',
    'give me something to work on',
    'where should I focus my energy',
    'what area needs the most work',
    'what needs work',
    'I want to improve',
    'I need to work on something',
    'I wanna level up',
    // weakness nouns / idioms
    "what's my kryptonite",
    'what is my downfall',
    "what's my achilles heel",
    'where are the holes in my game',
    'what are my leaks',
    'my sticking points',
    "what's my weakest phase",
    // struggle / predicate
    'what am I bad at',
    'what am I terrible at',
    'where do I struggle',
    'what am I weak at',
    'I keep hanging pieces',
    'I always blunder in the endgame',
    'why do I keep losing',
    "why can't I improve",
    'why am I stuck',
    'which phase do I lose in',
    'what mistakes do I keep making',
    // holding back / costing
    "what's holding my rating back",
    "what's capping my rating",
    'what keeps costing me points',
    // topic-scoped weakness
    'what openings do I lose in',
    'where am I weak in the endgame',
    'am I bad at calculation',
    'I struggle with tactics',
    'weak in endgames',
    // diagnose
    'diagnose my chess',
    'assess my game',
    // bare self-assessment (R6, David 2026-09-01) — must reach the profile
    'assess me',
    'size me up',
    'where do I stand',
    'rate my chess',
    'critique my game',
    'grade my play',
    // informal self-predicates + opening-weakness (2026-07-04 adversarial audit)
    'i suck at endgames',
    'i suck at tactics what do i do',
    "I'm terrible at endgames",
    "i'm no good at calculation",
    'i stink at the endgame',
    "what's my worst opening",
    'what is my weakest opening',
    'whats my worst defense',
  ])('matches (theorist surface): %s', (q) => expect(isProgressQuestion(q)).toBe(true));

  // NEGATIVES — near-misses that must NOT fire the weakness recommendation.
  // (opening-profile has its own describe block below.)
  it.each([
    'learn the Sicilian',            // opening-teach, not a recommendation
    'teach me the Najdorf',          // opening-teach
    'I want to learn the Caro-Kann', // opening-teach (desire frame excludes REC_VERBS)
    'study the London with me',      // opening-teach
    'what is a fork',                // concept
    'explain zugzwang',              // concept
    'why did I lose that game',      // single-game review (no keep/always)
    'what went wrong in my last game', // single-game review
    'is d5 a weak square here',      // positional weakness, not personal
    "what's the Sicilian weak against", // opening's weakness, not the student
    'drill my forks',                // drill imperative
    'practice tactics',              // drill imperative
    'give me a tactics puzzle',      // drill imperative
  ])('does NOT match (near-miss): %s', (q) => expect(isProgressQuestion(q)).toBe(false));
});

describe('isOpeningProfileQuestion (David 2026-07-04: wire the deterministic opening data)', () => {
  it.each([
    ["what's my strongest opening", 'strongest'],
    ['what is my best opening', 'strongest'],
    ['what opening am I strongest at', 'strongest'],
    ["what's my favorite opening", 'favorite'],
    ["what's my favourite opening", 'favorite'], // UK
    ['what is my go-to opening', 'favorite'],
    ['what opening do I play the most', 'favorite'],
    ['which opening do I play most', 'favorite'],
    ["what's my most-played opening", 'favorite'],
    ['my most played defense', 'favorite'],
    ["what's my weakest opening", 'weakest'],
    ['what is my worst opening', 'weakest'],
    ['what opening am I weakest at', 'weakest'],
  ])('matches "%s" (kind=%s)', (q, kind) => {
    expect(isOpeningProfileQuestion(q)).toBe(true);
    expect(openingProfileKind(q)).toBe(kind);
  });
  it.each([
    'teach me the Sicilian',       // teach a named opening, not a profile query
    'what is a fork',              // concept
    'what are my weaknesses',      // weakness themes, not an opening
    'is the London good',          // opening opinion, not the student's profile
  ])('does NOT match: %s', (q) => expect(isOpeningProfileQuestion(q)).toBe(false));
});

describe('isStatsQuestion (David 2026-07-04: rating / record / win-rate)', () => {
  it.each([
    "what's my rating",
    'what is my current rating',
    "what's my elo",
    "what's my rank",
    "what's my win rate",
    'what is my win-rate',
    "what's my record",
    'my overall record',
    'my game record',
    'my win rate',
    'how many games have I won',
    'how many games did I lose',
    "how many games i've played",
    'how often do I win',
    "what's my winning percentage",
    'how am I doing overall',
    "what's my overall performance",
    'what is my results',
    'how good am I',
    'how strong am I',
    "what's my w/l",
    "what's my stats",
    'what is my statistics',
    'my record',
    'my w-l record',
    'my w/l',
    'my w-l record and how am i doing',  // adversarial compound-question miss
  ])('matches "%s"', (q) => expect(isStatsQuestion(q)).toBe(true));
  it.each([
    'what are my weaknesses',       // weakness themes → progress
    "what's my strongest opening",  // opening profile
    'what am I good at',            // strengths, not stats
    'teach me the Sicilian',
    'what is a fork',
    'hi coach',
  ])('does NOT match: %s', (q) => expect(isStatsQuestion(q)).toBe(false));
});

describe('isStrengthsQuestion (David 2026-07-04: inverse of the weakness path)', () => {
  it.each([
    'what am I good at',
    'what do I do well',
    'what do I do best',
    'what am I best at',
    'what am I strong at',
    'what am I strong in',
    'what am I really strong at',
    'what are my strengths',
    "what's my biggest strength",
    'what is my main strength',
    'what are my top strengths',
    'my strengths',
    'my strong suit',
    "what's my strongest suit",
    "what's my best skill",
  ])('matches "%s"', (q) => expect(isStrengthsQuestion(q)).toBe(true));
  it.each([
    'what are my weaknesses',       // the opposite → progress
    'what am I bad at',             // weakness phrasing
    "what's my strongest opening",  // opening profile, not general strengths
    "what's my rating",            // stats
    'what is a pin',               // concept
    'nice to meet you coach',
  ])('does NOT match: %s', (q) => expect(isStrengthsQuestion(q)).toBe(false));
});

describe('isOpeningAccuracyQuestion (David 2026-07-04: accuracy WITHIN an opening / weakest sub-line)', () => {
  it.each([
    'how accurate am I in my favorite opening',
    "what's my accuracy in the Caro-Kann",
    'how accurate is my opening play',
    "what's the weakest part of my opening theory",
    'what is the weakest line in my repertoire',
    'what part of my opening do I need to work on',
    "what's my weakest variation",
    'which line should I work on',
    'which variation do I need to improve',
    'what do I need to work on to improve my opening theory',
    'help me improve my opening prep',
    'where am I weakest in my opening',
    'how well do I know my opening',
    'how accurately do I play the London',
    'what should I drill to improve my opening repertoire',
  ])('matches "%s"', (q) => expect(isOpeningAccuracyQuestion(q)).toBe(true));
  it.each([
    "what's my strongest opening",   // WHICH opening → opening-profile
    "what's my favorite opening",    // WHICH opening → opening-profile
    'what are my weaknesses',        // general weakness → progress
    'what should I train',           // general training → progress
    "what's my rating",             // stats
    'what is a fork',               // concept
    'teach me the Caro-Kann',       // teach a line, not an accuracy query
    'hi coach',
    // David 2026-07-05 visual audit: a BARE / OVERALL accuracy ask has no
    // opening object → it belongs to isAccuracyQuestion, not here. This used to
    // hijack to opening-accuracy (which runs first) and answer "drill a line".
    'how accurate am I overall?',
    'how accurate am I',
    "what's my accuracy",
    'how precise is my play',
    'my accuracy in general',
  ])('does NOT match: %s', (q) => expect(isOpeningAccuracyQuestion(q)).toBe(false));

  // The overall-accuracy counterparts DO route to isAccuracyQuestion.
  it.each([
    'how accurate am I overall?',
    'how accurate am I',
    "what's my accuracy",
    'how precise is my play',
  ])('overall accuracy "%s" → isAccuracyQuestion', (q) => expect(isAccuracyQuestion(q)).toBe(true));
});

describe('records vs opening-profile — "best opening" is NOT a records ask (David 2026-07-05 visual audit)', () => {
  it.each([
    'what is my best opening?',
    "what's my best opening",
  ])('"%s" → opening-profile, NOT records', (q) => {
    expect(isOpeningProfileQuestion(q)).toBe(true);
    expect(isRecordsQuestion(q)).toBe(false);
  });
  it.each([
    "what's my best scalp",
    'my best game',
    'my fastest win',
    'what are my bests',
  ])('"%s" → still a records ask', (q) => expect(isRecordsQuestion(q)).toBe(true));
});

describe('isOpeningTrapsQuestion (David 2026-07-04: traps in my strongest opening / watch out for)', () => {
  it.each([
    'what traps can I use in my strongest opening',
    'drill me on opening traps in my strongest opening for both white and black',
    'what should I watch out for in the Caro-Kann',
    'what are the traps in the Italian',
    'teach me the traps for my strongest opening',
    'what traps should I know',
    'show me some opening traps',
    'give me the traps for my repertoire',
    'how do you teach these traps',
    'what system do you use to teach these',
    'what should I look out for',
    'what are the common pitfalls in the Sicilian',
    'what traps do I need to watch out for',
  ])('matches "%s"', (q) => expect(isOpeningTrapsQuestion(q)).toBe(true));
  it.each([
    "what's my strongest opening",   // WHICH opening → opening-profile
    "what's my rating",             // stats
    'what is a fork',               // concept
    'teach me the Sicilian',        // teach a line, no trap
    'how accurate am I in my opening', // opening-accuracy
    'hi coach',
  ])('does NOT match: %s', (q) => expect(isOpeningTrapsQuestion(q)).toBe(false));
});

describe('opensTrapsSystemAsk — "how do you teach these / what system"', () => {
  it.each([
    'how do you teach these traps',
    'what system do you use to teach these',
    'how are these traps taught',
  ])('true for "%s"', (q) => expect(opensTrapsSystemAsk(q)).toBe(true));
  it.each([
    'what traps can I use in my strongest opening',
    'what should I watch out for',
  ])('false for "%s"', (q) => expect(opensTrapsSystemAsk(q)).toBe(false));
});

describe('isReviewDueQuestion (David 2026-07-04: SRS review-due — must NOT collide with review-game)', () => {
  it.each([
    "what's due for review today",
    "what's due",
    'anything due',
    'are there cards due',
    'how many cards do I have to review',
    'how many reviews do I have',
    'how many reps are due',
    'what should I review',
    'what do I need to review',
    'review my cards',
    'review my openings',
    'show me my review queue',
    'is my srs deck due',
    'any flashcards due',
    'what cards are due to review',
  ])('matches "%s"', (q) => expect(isReviewDueQuestion(q)).toBe(true));
  it.each([
    'review my last game',          // single-GAME review → coachAgent review-game
    'review my game',               // single-GAME review
    'can you review that game',      // single-GAME review
    "what's my rating",             // stats
    'what am I good at',            // strengths
    'teach me the Sicilian',
    'what is a fork',
    'hi coach',
  ])('does NOT match: %s', (q) => expect(isReviewDueQuestion(q)).toBe(false));
});

describe('Wave 1 — where-do-I-go-wrong cluster (David 2026-07-04)', () => {
  describe('isMistakesQuestion', () => {
    it.each([
      'what mistakes do I make',
      'what are my biggest mistakes',
      "what's my most common mistake",
      'how often do I blunder',
      "what's my blunder rate",
      'do I blunder a lot',
      'do I make a lot of mistakes',
      'where do I go wrong',
      'what do I do wrong',
      "what's my worst blunder",
      'how many blunders do I make',
    ])('matches "%s"', (q) => expect(isMistakesQuestion(q)).toBe(true));
    it.each(["what's my rating", 'teach me the Sicilian', 'is there a tactic here', 'what is a fork', 'hi coach'])(
      'does NOT match: %s', (q) => expect(isMistakesQuestion(q)).toBe(false));
  });

  describe('isLastGameMistakeQuestion (R6, David 2026-09-01 — last-game error, no game loaded)', () => {
    it.each([
      'what did I do wrong in my last game',
      'what was my critical error in my last game',
      'what was my critical error',
      'what was my biggest mistake',
      'what did I do wrong',
      'where did I go wrong',
      'what was the worst move in my last game',
      'what did I mess up in my previous game',
      'what was my turning point mistake',
      'where did I go wrong in my recent game',
      // last game +n (David 2026-09-01)
      'what did I do wrong 2 games ago',
      'what was my mistake in the game before last',
      'what did I do wrong in my last 3 games',
      'what went wrong in my recent games',
      'what was my blunder three games back',
    ])('matches "%s"', (q) => expect(isLastGameMistakeQuestion(q)).toBe(true));
    it.each([
      'what did I do wrong here',            // live board → board lane
      'what was my mistake in this game',    // in-context this-game lane
      'what was my mistake in this position',// live board
      'review my last game',                 // walkthrough action
      'go over my last game',                // walkthrough action
      'did I win my last game',              // result → isLastGameQuestion
      'what mistakes do I keep making',      // aggregate → isMistakesQuestion
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isLastGameMistakeQuestion(q)).toBe(false));
    // The last-game-error ask must NOT also fire the aggregate lanes.
    it('is excluded from the aggregate mistakes lane', () => {
      expect(isMistakesQuestion('what was my critical error in my last game')).toBe(false);
    });
    // Parity precedence (David 2026-09-01): "last 3 games" + "wrong" is an ERROR
    // ask, not a win/loss record — it must not be swallowed by stats/records.
    it('is excluded from the stats and records lanes', () => {
      expect(isStatsQuestion('what did I do wrong in my last 3 games')).toBe(false);
      expect(isRecordsQuestion('what did I do wrong in my last 3 games')).toBe(false);
    });
  });

  describe('isNameOpeningQuestion (P-IV.2, 2026-09-01)', () => {
    it.each([
      'what opening is this',
      'what opening am I playing',
      'which opening is this',
      'what is this opening called',
      'name this opening',
      'what opening did we just play',
    ])('matches "%s"', (q) => expect(isNameOpeningQuestion(q)).toBe(true));
    it.each([
      'what opening should I play',          // recommendation
      'how do I play the Sicilian',          // profile
      'teach me an opening',                 // action
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isNameOpeningQuestion(q)).toBe(false));
  });

  describe('isOpponentMoveQuestion (P-IV.1, 2026-09-01)', () => {
    it.each([
      'why did they play that',
      'why did the opponent play that',
      'why did my opponent move there',
      'what did they just do',
      'what is the opponent up to',
      'why that move',
      "what's the point of that move",
      'what did the computer play',
    ])('matches "%s"', (q) => expect(isOpponentMoveQuestion(q)).toBe(true));
    it.each([
      'why did I play that',                 // self-review
      'is Nf3 a good move',                  // named move → candidate lane
      'why is Nf3 best',                     // engine reasoning
      'what should I play',                  // best move
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isOpponentMoveQuestion(q)).toBe(false));
  });

  describe('weakness lifecycle + briefing (Part III, 2026-09-01)', () => {
    it.each([
      ['what have I fixed', 'fixed'],
      ['what did I used to struggle with', 'fixed'],
      ['what have I gotten better at', 'fixed'],
      ['what do I keep getting wrong', 'persistent'],
      ['what are my recurring mistakes', 'persistent'],
      ['what bad habits do I keep', 'persistent'],
      ["what's my biggest weakness", 'pressing'],
      ['what should I work on first', 'pressing'],
      ["what's hurting me the most", 'pressing'],
      ['where am I weakest', 'pressing'],
    ])('%s → %s', (q, kind) => expect(weaknessLifecycleKind(q)).toBe(kind));

    it.each(['hi coach', "what's my rating", 'teach me the Sicilian'])(
      'no lifecycle kind: %s', (q) => expect(weaknessLifecycleKind(q)).toBeNull());

    it.each([
      'break down my weaknesses',
      'what are my weaknesses',
      'show me my weaknesses',
      'where do I lose points',
    ])('briefing matches "%s"', (q) => expect(isWeaknessBriefingQuestion(q)).toBe(true));

    it('briefing yields to the pressing lane on "work on first"', () => {
      expect(isWeaknessBriefingQuestion('what should I work on first')).toBe(false);
    });
  });

  describe('isEndgamePlayRequest (Batch B, 2026-09-01)', () => {
    it.each([
      'play the Lucena with me',
      'let me try the rook ending',
      'practice king and pawn endgame with me',
      'drill the opposition with me',
      'train me on the Philidor',
      'let me play the pawn endgame',
    ])('matches "%s"', (q) => expect(isEndgamePlayRequest(q)).toBe(true));
    it.each([
      "what's the Lucena position",    // explain, not play
      'play the Italian with me',      // opening play
      'how do I hold a rook ending',   // technique question
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isEndgamePlayRequest(q)).toBe(false));
    it('a play request is still an endgame question (routes to the endgame lane)', () => {
      expect(isEndgameQuestion('play the Lucena with me')).toBe(true);
    });
  });

  describe('isEndgameWeaknessQuestion (loop tie-in, 2026-09-01)', () => {
    it.each([
      'what endgame am I weakest at',
      'which endings do I struggle with',
      'what endgame should I work on',
      'train my endgame weakness',
      "what's my endgame weakness",
      'help me with my endgames',
      'what endings do I lose',
    ])('matches "%s"', (q) => expect(isEndgameWeaknessQuestion(q)).toBe(true));
    it.each([
      "what's the Lucena position",   // technique
      'play the Lucena with me',      // named play request
      'how do I win a rook ending',   // technique how-to
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isEndgameWeaknessQuestion(q)).toBe(false));
  });

  describe('isTheoryQuestion (P-II.1, 2026-09-01)', () => {
    it.each([
      'how do I play against an isolated queen pawn',
      'how do I attack a castled king',
      'when should I trade queens',
      "what's the plan with the bishop pair",
      'how to exploit a weak square',
      'how do I convert a space advantage',
      "what's the best way to attack the king",
    ])('matches "%s"', (q) => expect(isTheoryQuestion(q)).toBe(true));
    it.each([
      'how do I improve',                    // progress/training
      'how do I use the tactics tab',        // app-help
      'what should I play here',             // live board
      'how do I play the Sicilian',          // named opening → profile
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isTheoryQuestion(q)).toBe(false));
  });

  describe('isErrorsBySituationQuestion (David 2026-07-13)', () => {
    it.each([
      "do I blunder more when I'm winning",
      'do I make more mistakes when ahead',
      'do I blunder when losing',
      'when I am winning do I go wrong',
      'do I choke when under pressure',
      'do I collapse when winning',
      'do I make errors while ahead',
    ])('matches "%s"', (q) => expect(isErrorsBySituationQuestion(q)).toBe(true));
    it.each(["what's my rating", 'how often do I play', 'teach me the Sicilian', 'hi coach'])(
      'does NOT match: %s', (q) => expect(isErrorsBySituationQuestion(q)).toBe(false));
  });

  describe('isMisconceptionsQuestion (David 2026-07-13)', () => {
    it.each([
      'what misconceptions do I have',
      'what thinking errors do I make',
      'what are my mental mistakes',
      'am I still making that mistake',
      'do I still fall for the same trap',
      'what am I stuck on',
      'what mistakes do I keep repeating',
      'is that an old error',
    ])('matches "%s"', (q) => expect(isMisconceptionsQuestion(q)).toBe(true));
    it.each(["what's my rating", 'teach me the Sicilian', 'what is a fork', 'hi coach'])(
      'does NOT match: %s', (q) => expect(isMisconceptionsQuestion(q)).toBe(false));
  });

  describe('isTacticsProfileQuestion (guarded vs live-board tactics)', () => {
    it.each([
      'how are my tactics',
      'what tactics do I miss',
      'do I miss tactics',
      "what's my tactical awareness",
      'am I good at tactics',
      'what motif do I miss the most',
      'do I see tactics',
    ])('matches "%s"', (q) => expect(isTacticsProfileQuestion(q)).toBe(true));
    it.each([
      'is there a tactic here',       // live board → isTacticsQuestion
      'any tactics here',
      'is there a tactic in this position',
      "what's my rating",
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isTacticsProfileQuestion(q)).toBe(false));
  });

  describe('isPhaseQuestion (guarded vs live-board endgame)', () => {
    it.each([
      'which phase am I weakest in',
      'what phase do I lose in',
      'where do I lose games',
      "how's my endgame play",
      'how is my opening',
      'how good is my middlegame',
      'am I better in the opening or endgame',
      "what's my worst phase",
    ])('matches "%s"', (q) => expect(isPhaseQuestion(q)).toBe(true));
    it.each([
      'is this endgame winning',      // live tablebase → isEndgameQuestion
      'how do I hold this',
      "what's my rating",
      'teach me the Sicilian',
      'hi coach',
    ])('does NOT match: %s', (q) => expect(isPhaseQuestion(q)).toBe(false));
  });
});

describe('isRepertoireGapQuestion + repertoireGapKind (David 2026-07-04: the promoted cluster)', () => {
  it.each([
    ['where do I leave theory', 'out-of-book'],
    ['where do I go out of book', 'out-of-book'],
    ['how often do I leave book', 'out-of-book'],
    ['where do I leave my prep', 'out-of-book'],
    ["what's a hole in my repertoire", 'hole'],
    ['what do I have no answer for', 'hole'],
    ['what am I not prepared for', 'hole'],
    ['what are the gaps in my repertoire', 'hole'],
    ['what do I struggle against', 'hole'],
    ['what openings give me trouble', 'hole'],
    ['what opening should I learn next', 'learn-next'],
    ['what should I add to my repertoire', 'learn-next'],
    ["what's the next opening to learn", 'learn-next'],
  ])('matches "%s" (kind=%s)', (q, kind) => {
    expect(isRepertoireGapQuestion(q)).toBe(true);
    expect(repertoireGapKind(q)).toBe(kind);
  });
  it.each([
    "what's my strongest opening",     // opening-profile
    'how accurate am I in my opening',  // opening-accuracy
    "what's my rating",
    'teach me the Sicilian',
    'hi coach',
  ])('does NOT match: %s', (q) => expect(isRepertoireGapQuestion(q)).toBe(false));
});

describe('Wave 3 detectors — accuracy / consistency / converting', () => {
  it.each(['how accurate am I overall', "what's my accuracy", 'how precise is my play',
    'how often do I find the best move', 'how engine-like am I', "what's my move quality"])(
    'accuracy matches "%s"', (q) => expect(isAccuracyQuestion(q)).toBe(true));
  it.each(['how accurate am I in my opening', "what's my rating", 'hi coach'])(
    'accuracy does NOT match: %s', (q) => expect(isAccuracyQuestion(q)).toBe(false));

  it.each(['am I on a streak', "what's my win streak", 'how consistent am I',
    'what time control am I best at', 'am I better at blitz or rapid', 'my best time control'])(
    'consistency matches "%s"', (q) => expect(isConsistencyQuestion(q)).toBe(true));
  it.each(["what's my rating", 'hi coach'])(
    'consistency does NOT match: %s', (q) => expect(isConsistencyQuestion(q)).toBe(false));

  it.each(['do I convert winning positions', 'do I close out wins', 'do I throw away winning positions',
    'do I come back from losing positions', 'how do I win my games', 'am I a grinder or attacker'])(
    'converting matches "%s"', (q) => expect(isConvertingQuestion(q)).toBe(true));
  it.each(["what's my rating", 'teach me the Sicilian', 'hi coach'])(
    'converting does NOT match: %s', (q) => expect(isConvertingQuestion(q)).toBe(false));
});

describe('buildQuestionGrounding — shared cross-surface grounding (David 2026-07-04)', () => {
  it('sets the progress flag for a weakness question (board-independent)', () => {
    const g = buildQuestionGrounding('what am I weak in?');
    expect(g.progressQuestion).toBe(true);
    expect(g.openingProfileQuestion).toBe(false);
    expect(g.currentFen).toBeUndefined();
    expect(g.surface).toBe('/coach/chat');
  });
  it('sets the opening-profile flag + kind for a strongest-opening question', () => {
    const g = buildQuestionGrounding("what's my strongest opening", {}, 'game-chat');
    expect(g.openingProfileQuestion).toBe(true);
    expect(g.openingProfileKind).toBe('strongest');
    expect(g.surface).toBe('/coach/play');
  });
  it('threads the board fields + tactics flag for a live-board tactics question', () => {
    const g = buildQuestionGrounding('is there a tactic here?', { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', studentColor: 'white' }, 'game-chat');
    expect(g.tacticsQuestion).toBe(true);
    expect(g.currentFen).toContain('RNBQK2R');
    expect(g.studentColor).toBe('white');
  });
  it('threads openingId + concept flag for a concept question on the course page', () => {
    const g = buildQuestionGrounding('what is a fork', { openingId: 'italian-game' });
    expect(g.conceptQuestion).toBe(true);
    expect(g.openingId).toBe('italian-game');
  });
  it('sets the stats flag for a rating question (board-independent)', () => {
    const g = buildQuestionGrounding("what's my win rate");
    expect(g.statsQuestion).toBe(true);
    expect(g.strengthsQuestion).toBe(false);
    expect(g.progressQuestion).toBe(false);
  });
  it('sets the strengths flag (and NOT progress) for a "what am I good at" question', () => {
    const g = buildQuestionGrounding('what am I good at');
    expect(g.strengthsQuestion).toBe(true);
    expect(g.statsQuestion).toBe(false);
    // progress no longer collides — positive predicates moved to the strengths path
    expect(g.progressQuestion).toBe(false);
  });
  it('sets the opening-accuracy flag for a "weakest part of my opening theory" question', () => {
    const g = buildQuestionGrounding("what's the weakest part of my opening theory");
    expect(g.openingAccuracyQuestion).toBe(true);
    expect(g.openingProfileQuestion).toBe(false); // not a WHICH-opening question
    expect(g.statsQuestion).toBe(false);
  });
  it('sets the opening-traps flag (+ system ask) for a teaching-system trap question', () => {
    const g = buildQuestionGrounding('how do you teach these traps');
    expect(g.openingTrapsQuestion).toBe(true);
    expect(g.openingTrapsSystemAsk).toBe(true);
  });
  it('sets the opening-traps flag without the system ask for a plain trap question', () => {
    const g = buildQuestionGrounding('what traps can I use in my strongest opening');
    expect(g.openingTrapsQuestion).toBe(true);
    expect(g.openingTrapsSystemAsk).toBe(false);
  });
  it('sets NO intent flags for a non-question utterance (falls to normal LLM)', () => {
    const g = buildQuestionGrounding('hey coach nice to see you');
    expect(g.progressQuestion).toBe(false);
    expect(g.openingProfileQuestion).toBe(false);
    expect(g.tacticsQuestion).toBe(false);
    expect(g.conceptQuestion).toBe(false);
    expect(g.statsQuestion).toBe(false);
    expect(g.strengthsQuestion).toBe(false);
    expect(g.openingAccuracyQuestion).toBe(false);
    expect(g.openingTrapsQuestion).toBe(false);
    expect(g.reviewDueQuestion).toBe(false);
  });
  it('sets the review-due flag for a "what\'s due" question', () => {
    const g = buildQuestionGrounding("what's due for review today");
    expect(g.reviewDueQuestion).toBe(true);
  });
});

describe('isBestMoveQuestion', () => {
  it.each([
    "what's the best move here?",
    'what is the strongest continuation',
    'the best option here',
    'what should I play',
    'what would you play here',
    'is Nf3 the best move',
    'is this sound',
    'is that correct',
    'what is the right move',
    'should I take the pawn',
    'what is the move here',
    'top move?',
  ])('matches: %s', (q) => expect(isBestMoveQuestion(q)).toBe(true));
});

describe('isTacticsQuestion', () => {
  it.each([
    'is anything hanging',
    "what's the threat",
    'is there a fork here',
    'am I in danger',
    'is my queen safe',
    'is there a pin',
    'any tactics here',
    'is there a combination',
    'can I win material',
    'is there a sacrifice here',
    'is there mate in two',
    'is my rook loose',
  ])('matches: %s', (q) => expect(isTacticsQuestion(q)).toBe(true));
});

describe('isPositionAssessmentQuestion', () => {
  it.each([
    "who's winning",
    'who is better',
    "what's the eval",
    'what is the evaluation',
    'am I winning',
    'is this position good for me',
    'is it equal',
    'how do I stand',
    'where do I stand',
    "how's my position",
    'who has the advantage',
    'what is the situation',
    'is this drawish',
  ])('matches: %s', (q) => expect(isPositionAssessmentQuestion(q)).toBe(true));
});

describe('isMasterPlayQuestion', () => {
  it.each([
    'what do the masters play here',
    'how do grandmasters handle this',
    'what do GMs prefer',
    'most popular move',
    'most common continuation',
    "what's the main line",
    'what is the book move',
    'what does theory say',
    'what is usually played here',
  ])('matches: %s', (q) => expect(isMasterPlayQuestion(q)).toBe(true));
});

describe('isEndgameQuestion', () => {
  it.each([
    'is this endgame winning',
    'can I win this ending',
    'how do I hold this',
    'how do I convert this',
    'is this a theoretical draw',
    'is it drawn',
    'can this be held',
  ])('matches: %s', (q) => expect(isEndgameQuestion(q)).toBe(true));
});

describe('isPlayerGamesQuestion', () => {
  it.each([
    'how does Naroditsky play this',
    'show me his games',
    "show me Carlsen's games",
    'what does he play here',
    'has he ever played this',
    'his real games',
    'what did Hikaru play',
  ])('matches: %s', (q) => expect(isPlayerGamesQuestion(q)).toBe(true));
});

describe('isConceptQuestion', () => {
  it.each([
    "what's a fork",
    'what is zugzwang',
    'explain the minority attack',
    'define zwischenzug',
    'tell me about prophylaxis',
    'what does en passant mean',
    'what is the difference between a pin and a skewer',
  ])('matches: %s', (q) => expect(isConceptQuestion(q)).toBe(true));
  it('does NOT fire on position-specific cues (those go to tactics/best-move)', () => {
    expect(isConceptQuestion('is there a fork here')).toBe(false);
    expect(isConceptQuestion('what should I play here')).toBe(false);
  });
});

describe('isPlanQuestion', () => {
  it.each([
    "what's my plan",
    'what is the plan here',
    'what is my strategy',
    'what are the main ideas',
    'how should I proceed',
    'what is the idea here',
    'what am I trying to do',
    'outline a plan',
    'what are my next few moves',
  ])('matches: %s', (q) => expect(isPlanQuestion(q)).toBe(true));
});

// David 2026-06-14: strengthen ALL routers' vocabulary, not just weakness.
describe('strengthened vocabulary across every router', () => {
  const cases: Array<[string, (ask: string | undefined) => boolean, string]> = [
    ['plan', isPlanQuestion, 'where do my pieces belong'],
    ['plan', isPlanQuestion, 'what is the right setup'],
    ['plan', isPlanQuestion, 'what am I supposed to do'],
    ['best-move', isBestMoveQuestion, 'what do I do here'],
    ['best-move', isBestMoveQuestion, 'are there candidate moves'],
    ['best-move', isBestMoveQuestion, "what's the engine's pick"],
    ['best-move', isBestMoveQuestion, 'is there a better move'],
    ['tactics', isTacticsQuestion, 'is my bishop undefended'],
    ['tactics', isTacticsQuestion, 'can I sacrifice'],
    ['tactics', isTacticsQuestion, 'is there a back-rank weakness'],
    ['position', isPositionAssessmentQuestion, 'how bad is it'],
    // NB: "am I up material" now routes to the positional-FEATURE assembler
    // (material topic), not the eval — see positionalTopic (David 2026-07-10,
    // "answers calculated with the correct deterministic data").
    ['position', isPositionAssessmentQuestion, 'am I winning here'],
    ['position', isPositionAssessmentQuestion, 'who has the edge'],
    ['position', isPositionAssessmentQuestion, 'is it lost'],
    ['master-play', isMasterPlayQuestion, 'what is standard here'],
    ['master-play', isMasterPlayQuestion, 'how is this usually played'],
    ['master-play', isMasterPlayQuestion, 'what do the top players do'],
    ['endgame', isEndgameQuestion, 'is this winnable'],
    ['endgame', isEndgameQuestion, 'can I save this'],
    ['endgame', isEndgameQuestion, 'how do I convert from here'],
    ['player-games', isPlayerGamesQuestion, 'did he play this'],
    ['player-games', isPlayerGamesQuestion, 'how did Carlsen win'],
    ['player-games', isPlayerGamesQuestion, 'pull up his games'],
    ['concept', isConceptQuestion, 'what is the idea behind the fianchetto'],
    ['concept', isConceptQuestion, 'why is the bishop pair good'],
    ['concept', isConceptQuestion, 'what are the principles'],
  ];
  it.each(cases)('%s router matches: %s', (_label, fn, q) => expect(fn(q)).toBe(true));
});

describe('cross-router disambiguation (must NOT collide)', () => {
  it('progress questions are not mistaken for position assessment', () => {
    // "am I improving" is about the student over time, NOT "am I winning".
    expect(isProgressQuestion('am I improving')).toBe(true);
    expect(isPositionAssessmentQuestion('am I improving')).toBe(false);
  });
  it('a positional weakness is not a personal-progress question', () => {
    // "is d5 a weak square" is about the BOARD, not the student's weaknesses.
    expect(isProgressQuestion('is d5 a weak square here')).toBe(false);
  });
  it('best-move stays distinct from master-play', () => {
    expect(isBestMoveQuestion('what should I play here')).toBe(true);
    expect(isMasterPlayQuestion('what do the masters play here')).toBe(true);
  });
});

describe('recordVsTarget / isRecordVsQuestion (David 2026-07-04: record vs a specific opening OR opponent)', () => {
  it('captures the opening target after against/vs/in', () => {
    expect(recordVsTarget('how do I do against the Sicilian')).toBe('Sicilian');
    expect(recordVsTarget('my record vs the French')).toBe('French');
    expect(recordVsTarget("what's my record in the Najdorf")).toBe('Najdorf');
    expect(recordVsTarget('how do I fare against the Caro-Kann')).toBe('Caro-Kann');
    // Escalation-pass break (2026-07-04) — "w/l" lead now recognized.
    expect(recordVsTarget("what's my w/l in the najdorf")).toBe('najdorf');
    expect(isRecordVsQuestion('my win/loss vs the london')).toBe(true);
  });
  it('captures the opponent target', () => {
    expect(recordVsTarget('my record against Magnus')).toBe('Magnus');
    expect(recordVsTarget('results against DrNykterstein')).toBe('DrNykterstein');
    expect(recordVsTarget("what's my head to head with Nakamura")).toBe('Nakamura');
  });
  it('is case- and whitespace-insensitive', () => {
    expect(isRecordVsQuestion('HOW DO I DO AGAINST THE SICILIAN')).toBe(true);
    expect(isRecordVsQuestion('  my record vs the french  ')).toBe(true);
  });
  it('does NOT fire on a bare records/stats question (no target)', () => {
    expect(isRecordVsQuestion("what's my record")).toBe(false);
    expect(isRecordVsQuestion('my win rate')).toBe(false);
    expect(recordVsTarget("what's my best game")).toBe(null);
    // The generic records/stats verticals still own those.
    expect(isRecordsQuestion("what's my best game")).toBe(true);
  });
  it('drops a bare pronoun/filler target so it does not fire on nothing', () => {
    expect(recordVsTarget('how do I do against them')).toBe(null);
    expect(recordVsTarget('how do I do against it')).toBe(null);
  });
  it('keeps a qualified filler like "that player" (unresolvable → no-data, still covered)', () => {
    expect(recordVsTarget('how do I fare vs that player')).toBe('that player');
    expect(isRecordVsQuestion('how do I fare vs that player')).toBe(true);
  });
});

describe('isMoveRatingQuestion (David 2026-07-04: rate the move just played)', () => {
  it.each([
    'was that a good move',
    'was that a good move?',
    'rate my last move',
    'rate my move',
    'was that a blunder',
    'was that a mistake',
    'was my last move good',
    'was my move a mistake',
    'how good was that move',
    'how was that move',
    'did i play that right',
    'grade my move',
    'was that the best move',
    'WAS THAT A GOOD MOVE',
    '  rate my last move  ',
    // Escalation-pass breaks (2026-07-04 adversarial run) — now regression-locked.
    'was that move ok',
    'was that move any good',
    'was picking that a mistake',
    'was my move correct',
    'was my move sound',
    'was that a strong move',
    // plain-English named move (R6, David 2026-09-01 — beginner phrasing)
    'was my knight to d5 a good move',
    'was my knight to d5 good',
    'was the bishop to c4 a mistake',
    'was my pawn to e5 bad',
    'was moving my knight to d5 a mistake',
    'was playing my queen to h5 good',
  ])('matches: %s', (q) => expect(isMoveRatingQuestion(q)).toBe(true));

  it.each([
    'what should I play here',      // asking for THE best (bestMove), not rating a played move
    'what is the best move',        // bestMove
    "what's a good opening",        // opening opinion
    'what are my weaknesses',       // progress
    'how do I do against the Sicilian', // record-vs
  ])('does NOT match: %s', (q) => expect(isMoveRatingQuestion(q)).toBe(false));

  it('stays distinct from the forward best-move ask (chokepoint runs rating first when a move was played)', () => {
    // "was that the best move" is a rating (past); "what's the best move" is forward.
    expect(isMoveRatingQuestion('was that the best move')).toBe(true);
    expect(isBestMoveQuestion('what is the best move here')).toBe(true);
  });
});

describe('trainingRequestKind (David 2026-07-04: "set up X training" → launch the game-sourced surface)', () => {
  it.each([
    ['set up calculation training', 'calculation'],
    ['start calculation practice', 'calculation'],
    ['train my visualization', 'calculation'],
    ['give me calculation training', 'calculation'],
    ['drill my tactics', 'tactics'],
    ['practice tactics', 'tactics'],
    ['work on my tactical vision', 'tactics'],
    ['set up endgame training', 'endgame'],
    ['train endgames', 'endgame'],
    ['practice my endings', 'endgame'],
    ['drill my mistakes', 'mistakes'],
    ['train on my blunders', 'mistakes'],
    ['practice my weaknesses', 'weakness'],
    ['drill my weak spots', 'weakness'],
    ['work on my openings', 'opening'],
    ['train my repertoire', 'opening'],
    ['start a game review', 'review'],
    ['review my games', 'review'],
    ['SET UP CALCULATION TRAINING', 'calculation'],
    ['  drill my tactics  ', 'tactics'],
  ] as const)('maps "%s" → %s', (q, kind) => {
    expect(trainingRequestKind(q)).toBe(kind);
    expect(isTrainingRequest(q)).toBe(true);
  });

  it.each([
    'what are my weaknesses',          // progress — a diagnosis, not a "set up X" imperative
    'which opening am I weakest in',   // opening-profile
    'how accurate am I',               // accuracy
    'what should I train',             // bare recommendation, no named topic → progress/rec, not a launch
    'was that a good move',            // move-rating
    'how do I do against the Sicilian',// record-vs
    'what is the best move',           // best-move
    '',                                // empty
  ])('does NOT fire on: %s', (q) => {
    expect(trainingRequestKind(q)).toBeNull();
    expect(isTrainingRequest(q)).toBe(false);
  });

  it('undefined is safe', () => {
    expect(trainingRequestKind(undefined)).toBeNull();
    expect(isTrainingRequest(undefined)).toBe(false);
  });
});

describe('isImprovementTrendQuestion (David 2026-07-04: "am I improving?" wants a TREND, not a weakness dump)', () => {
  it.each([
    'am I improving',
    'am I improving?',
    'am I getting better',
    'am I getting any better',
    'am I getting worse',
    'am I progressing',
    'am I plateauing',
    'am I regressing',
    'have I improved',
    'have I gotten better',
    'did I improve',
    'is my game improving',
    'is my accuracy going up',
    'is my rating trending up',
    'is my chess getting better',
    'is my play declining',
    'how am I trending',
    "how's my improvement been",
    'how has my progress been going',
    'am I better than I was',
    'am I better than last month',
    'am I making progress',
    'my improvement over time',
    'AM I IMPROVING',
  ])('matches: %s', (q) => expect(isImprovementTrendQuestion(q)).toBe(true));

  it.each([
    'what are my weaknesses',           // progress — current weakness dump
    'what should I work on',            // recommendation
    "what's my weakest opening",        // opening-profile
    'how do I improve my tactics',      // training request
    'what is the best move',            // best-move
    '',
  ])('does NOT match: %s', (q) => expect(isImprovementTrendQuestion(q)).toBe(false));

  it('trend is checked BEFORE progress in the chokepoint — both may fire, trend must win', () => {
    // "am I improving" trips BOTH detectors; coachApi runs the trend block
    // first. This asserts the overlap exists (so the ordering matters) — the
    // routing order is enforced in coachApi, verified by the master-integration
    // path. Here we just lock that trend recognizes the phrasing progress owns.
    expect(isImprovementTrendQuestion('am I improving')).toBe(true);
    expect(isProgressQuestion('am I improving')).toBe(true);
  });
});

describe('isAppHelpQuestion (F15: what does the X tab/tool DO)', () => {
  it('matches app-surface help questions', () => {
    expect(isAppHelpQuestion('what does the tactics tab do?')).toBe(true);
    expect(isAppHelpQuestion('how does the calculation trainer work?')).toBe(true);
    expect(isAppHelpQuestion('what can I do in here?')).toBe(true);
    expect(isAppHelpQuestion('explain the review page')).toBe(true);
  });

  it('does NOT fire on a chess question (no UI-surface anchor)', () => {
    expect(isAppHelpQuestion('how does the Sicilian work?')).toBe(false);
    expect(isAppHelpQuestion('what does the knight do?')).toBe(false);
    expect(isAppHelpQuestion('teach me the London system')).toBe(false);
  });

  it('is empty-safe', () => {
    expect(isAppHelpQuestion(undefined)).toBe(false);
    expect(isAppHelpQuestion('')).toBe(false);
  });
});

describe('isCandidateMoveQuestion / extractCandidateSan (Bug 2, David 2026-07-10)', () => {
  it.each([
    'is Qf3 ok to play?',
    'is Qf3 ok',
    'can I play Nf3 here?',
    'what about Bc4',
    'is exd5 a good move',
    'would Qh5 be ok',
    'should I play O-O',
    'does Ng5 work',
    'is a3 playable',
    // The literal whatif — the canonical phrasing the list never carried
    // (caught 2026-08-06 re-verifying the inversion inventory).
    'what if I play Nf3?',
    'what happens if I take exd5',
    'what happens after Bc4',
  ])('matches a NAMED-move soundness ask: %s', (q) => {
    expect(isCandidateMoveQuestion(q)).toBe(true);
  });

  it.each([
    'what is the best move',          // best-move, no named candidate
    'why is Nf3 the best move',       // engine-reasoning (why) wins
    'is this ok',                      // no SAN named
    'how does GothamChess play this',  // player-games, not a candidate
    'what should I do here',
  ])('does NOT match: %s', (q) => {
    expect(isCandidateMoveQuestion(q)).toBe(false);
  });

  it('extracts the named SAN (piece, pawn, capture, castle)', () => {
    expect(extractCandidateSan('is Qf3 ok')).toBe('Qf3');
    expect(extractCandidateSan('can I play exd5')).toBe('exd5');
    expect(extractCandidateSan('what about e4')).toBe('e4');
    expect(extractCandidateSan('should I play O-O')).toBe('O-O');
    expect(extractCandidateSan('is Rxe7+ any good')).toBe('Rxe7+');
  });

  // R2 (David 2026-09-01, his real words): "if a bishop sac on h7 was sound".
  // Plain-English sac/capture must resolve to a piece-qualified SAN so
  // buildCandidateEval can play it (chess.js resolves the capture from piece +
  // square even without the 'x').
  it('extracts a plain-English sac / capture as a piece-qualified move', () => {
    expect(extractCandidateSan('is the bishop sac on h7 sound')).toBe('Bh7');
    expect(extractCandidateSan('does the knight sac on f7 work')).toBe('Nf7');
    expect(extractCandidateSan('was the bishop takes on h7 a mistake')).toBe('Bh7');
    expect(extractCandidateSan('knight captures on e5')).toBe('Ne5');
  });
  it('routes plain-English sac questions to the candidate lane', () => {
    expect(isCandidateMoveQuestion('is the bishop sac on h7 sound')).toBe(true);
    expect(isCandidateMoveQuestion('does the knight sac on f7 work')).toBe(true);
  });

  it('does not grab a plain word as a move', () => {
    expect(extractCandidateSan('is the Najdorf ok')).toBeNull();
    expect(extractCandidateSan('what about the endgame')).toBeNull();
  });
});

describe('isAlternativesQuestion — comparative "why are the alternatives worse" (2026-07-11)', () => {
  it('matches the live-prod compound ask that motivated the assembler', () => {
    expect(isAlternativesQuestion(
      "What's the strongest move for me in this exact position, and why is it the best? Explain the key idea and why the natural alternatives are worse.",
    )).toBe(true);
  });

  it('matches the direct comparative phrasings', () => {
    expect(isAlternativesQuestion('why are the alternatives worse?')).toBe(true);
    expect(isAlternativesQuestion('why are the other moves not as good')).toBe(true);
    expect(isAlternativesQuestion('what else could I play here?')).toBe(true);
    expect(isAlternativesQuestion('what are my other options')).toBe(true);
    expect(isAlternativesQuestion('any other good moves here?')).toBe(true);
    expect(isAlternativesQuestion('compare Nf3 with the alternatives')).toBe(true);
    expect(isAlternativesQuestion('what should I play instead?')).toBe(true);
    expect(isAlternativesQuestion('why is Qe3 better than the other moves?')).toBe(true);
  });

  it('does NOT fire on plain best-move / why-best asks (those keep their branches)', () => {
    expect(isAlternativesQuestion("what's the best move?")).toBe(false);
    expect(isAlternativesQuestion('why is Qe3 best?')).toBe(false);
    expect(isAlternativesQuestion('is Qf3 ok to play?')).toBe(false);
    expect(isAlternativesQuestion(undefined)).toBe(false);
  });
});

// ── "WHY IS h3 BETTER?" ───────────────────────────────────────────────────
// 🔒 THE LANE COULD NOT BE TRIGGERED BY ITS OWN QUESTION. The review's
// why-best-move answer exists for exactly this ask — its code comment quotes
// David verbatim, "why h3 was the better move" — and the pattern listed
// `best|the move|winning|right|correct|strong|good` without `better`. So
// "Why is h3 better?" matched NO intent at all: not why, not best-move, not
// plan, not candidate. It fell through to the generic path and came back as the
// stock "I can't verify that precisely", on a surface holding the analysis that
// would have answered it.
describe('why-is-X-better reaches the why lane', () => {
  it('matches the natural phrasings, with a SAN or a pronoun', () => {
    for (const q of [
      'Why is h3 better?',
      'why is h3 better',
      'Why is Nf3 better?',
      'Why was Qxd5 better?',
      'Why is O-O better?',
      'Why is this move better?',
      'Why is that move stronger?',
    ]) {
      expect(isWhyBestMoveQuestion(q), q).toBe(true);
    }
  });

  it('does NOT swallow a question about the POSITION', () => {
    // The reason `better` is anchored on a move-shaped subject instead of
    // being dropped into the existing alternation: a bare `better` there turns
    // "why is my position better" into an engine-line walk when the student
    // asked for an assessment.
    expect(isWhyBestMoveQuestion('Why is my position better?')).toBe(false);
  });
});
