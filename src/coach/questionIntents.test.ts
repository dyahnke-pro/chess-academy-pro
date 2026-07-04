import { describe, it, expect } from 'vitest';
import {
  isPlanQuestion,
  isBestMoveQuestion,
  isTacticsQuestion,
  isPositionAssessmentQuestion,
  isMasterPlayQuestion,
  isEndgameQuestion,
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
  isTacticsProfileQuestion,
  isPhaseQuestion,
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
  ])('does NOT match: %s', (q) => expect(isOpeningAccuracyQuestion(q)).toBe(false));
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
    ['position', isPositionAssessmentQuestion, 'am I up material'],
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
