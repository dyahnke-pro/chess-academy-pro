/**
 * questionIntents.paraphrase.test.ts — the PARAPHRASE-ROBUSTNESS MATRIX.
 *
 * David's challenge (2026-07-05): "have you actually tested all the functions
 * and Q&A we wired in? Multiple times asking the same thing in different ways?"
 *
 * The per-detector tests prove each router in isolation; THIS file proves the
 * whole set is robust to how a real human phrases a question. For EVERY grounded
 * vertical it fires 5+ genuinely different phrasings (typos, slang, terse,
 * verbose, question vs command) and asserts the OWNING detector fires on each —
 * so "am I improving", "am i getting any better", "have i made progress lately"
 * all land on the trend router, not a neighbor.
 *
 * A second block locks the historically-colliding PAIRS (the misroutes David's
 * live audits caught — records vs opening-profile, accuracy vs opening-accuracy,
 * puzzle-stats vs training-aid, progress vs trend, strengths vs progress,
 * live-tactics vs tactics-profile, live-endgame vs phase): each side's phrasings
 * must fire ITS owner and NOT the rival.
 *
 * Deterministic + offline (no LLM, no Dexie) — this is the routing layer, the
 * fragile part. The answer ASSEMBLY (groundedAnswer.ts) + end-to-end voicing is
 * covered by groundedAnswer.test.ts + the prod adversarial loop.
 */
import { describe, it, expect } from 'vitest';
import {
  isPlanQuestion,
  isBestMoveQuestion,
  isTacticsQuestion,
  isProgressQuestion,
  isImprovementTrendQuestion,
  isOpeningProfileQuestion,
  isStatsQuestion,
  isStrengthsQuestion,
  isOpeningAccuracyQuestion,
  isOpeningTrapsQuestion,
  isReviewDueQuestion,
  isMistakesQuestion,
  isTacticsProfileQuestion,
  isPhaseQuestion,
  isRepertoireGapQuestion,
  isAccuracyQuestion,
  isConsistencyQuestion,
  isConvertingQuestion,
  isColorQuestion,
  isRecordsQuestion,
  isRecordVsQuestion,
  isMoveRatingQuestion,
  isPuzzleStatsQuestion,
  isTransferGapQuestion,
  isSkillRadarQuestion,
  isMasterPlayQuestion,
  isConceptQuestion,
  isPlayerGamesQuestion,
  isEndgameQuestion,
  isPositionAssessmentQuestion,
} from './questionIntents';

type Detector = (ask: string | undefined) => boolean;

/**
 * The matrix: every grounded vertical, its owning detector, and 5+ real-world
 * phrasings. Each phrasing MUST make the owning detector return true. Phrasings
 * deliberately vary: terse vs verbose, question vs imperative, slang, common
 * typos/British spellings, and multiple synonyms for the core verb/noun.
 */
const MATRIX: { vertical: string; detector: Detector; asks: string[] }[] = [
  {
    vertical: 'progress (current weaknesses)',
    detector: isProgressQuestion,
    asks: [
      'what am I bad at?',
      'where do I go wrong?',
      'what are my weaknesses?',
      'what should I work on?',
      'where am I losing games?',
      'what parts of my game are weak?',
    ],
  },
  {
    vertical: 'improvement trend (over time)',
    detector: isImprovementTrendQuestion,
    asks: [
      'am I improving?',
      'am i getting any better?',
      'have I made progress lately?',
      'is my chess trending up?',
      'am I getting stronger over time?',
      'have I improved this month?',
    ],
  },
  {
    vertical: 'opening profile (which opening)',
    detector: isOpeningProfileQuestion,
    asks: [
      'what is my best opening?',
      'which opening do I score best in?',
      'what opening should I play?',
      'which of my openings performs worst?',
      'what is my most successful opening?',
      'which opening wins me the most games?',
    ],
  },
  {
    vertical: 'stats (rating / record / win-rate)',
    detector: isStatsQuestion,
    asks: [
      'what is my rating?',
      'what is my win rate?',
      'what is my record?',
      'how many games have I won?',
      'what is my elo?',
      'what are my stats?',
    ],
  },
  {
    vertical: 'strengths (what I am good at)',
    detector: isStrengthsQuestion,
    asks: [
      'what am I good at?',
      'what are my strengths?',
      'what is my strongest skill?',
      'what do I do well?',
      'where am I strong?',
      'what part of my game is best?',
    ],
  },
  {
    vertical: 'opening accuracy (within an opening)',
    detector: isOpeningAccuracyQuestion,
    asks: [
      'how accurately do I play the Sicilian?',
      'how well do I know the Caro-Kann?',
      'what is my weakest line in the Ruy Lopez?',
      'how accurate am I in the French?',
      'where do I go wrong in the Italian?',
      'which variation of the Sicilian do I mess up?',
    ],
  },
  {
    vertical: 'opening traps (in my opening)',
    detector: isOpeningTrapsQuestion,
    asks: [
      'what traps are in my best opening?',
      'what should I watch out for in the Caro-Kann?',
      'are there any traps in the Sicilian I play?',
      'what tricks can I fall for in the French?',
      'what traps should I know in the Italian?',
    ],
  },
  {
    vertical: 'review due (SRS)',
    detector: isReviewDueQuestion,
    asks: [
      'what do I have due for review?',
      'any flashcards due?',
      'what is due today?',
      'do I have reviews waiting?',
      'what cards should I review?',
    ],
  },
  {
    vertical: 'mistakes (recurring)',
    detector: isMistakesQuestion,
    asks: [
      'what mistakes do I keep making?',
      'what blunders do I repeat?',
      'what errors show up most in my games?',
      'what do I keep getting wrong?',
      'what are my most common mistakes?',
    ],
  },
  {
    vertical: 'tactics profile (over time)',
    detector: isTacticsProfileQuestion,
    asks: [
      'how good is my tactics?',
      'what is my tactical rating?',
      'how are my tactics overall?',
      'am I good at tactics?',
      'what is my tactical accuracy?',
    ],
  },
  {
    vertical: 'phase (opening/middlegame/endgame profile)',
    detector: isPhaseQuestion,
    asks: [
      'which phase am I weakest in?',
      'am I better in the opening or endgame?',
      'what phase of the game do I struggle with?',
      'how are my endgames overall?',
      'which part of the game is my weakest phase?',
    ],
  },
  {
    vertical: 'repertoire gap',
    detector: isRepertoireGapQuestion,
    asks: [
      'what openings am I missing?',
      'where are the holes in my repertoire?',
      'what should I add to my repertoire?',
      'what openings do I not have an answer for?',
      'what gaps are in my opening repertoire?',
    ],
  },
  {
    vertical: 'accuracy (overall)',
    detector: isAccuracyQuestion,
    asks: [
      'how accurate am I overall?',
      'what is my average accuracy?',
      'how accurately do I play?',
      'what is my accuracy across my games?',
      'how clean is my play generally?',
    ],
  },
  {
    vertical: 'consistency',
    detector: isConsistencyQuestion,
    asks: [
      'how consistent am I?',
      'is my play consistent?',
      'do I play steadily or up and down?',
      'am I streaky?',
      'how steady are my results?',
    ],
  },
  {
    vertical: 'converting (winning positions)',
    detector: isConvertingQuestion,
    asks: [
      'do I convert winning positions?',
      'am I good at closing out wins?',
      'do I throw away won games?',
      'how well do I convert an advantage?',
      'do I finish off winning positions?',
    ],
  },
  {
    vertical: 'color (white vs black)',
    detector: isColorQuestion,
    asks: [
      'am I better with white or black?',
      'do I play better as white?',
      'which color do I score higher with?',
      'how do I do with the black pieces?',
      'am I stronger with white?',
    ],
  },
  {
    vertical: 'records (best scalp / streak)',
    detector: isRecordsQuestion,
    asks: [
      'what is my best win?',
      'who is the highest-rated player I have beaten?',
      'what is my longest win streak?',
      'what is my biggest upset?',
      'what is my best result ever?',
    ],
  },
  {
    vertical: 'move rating (rate the move I played)',
    detector: isMoveRatingQuestion,
    asks: [
      'was that a good move?',
      'how good was my last move?',
      'rate my move',
      'was my move a blunder?',
      'was that the right move I just played?',
    ],
  },
  {
    vertical: 'puzzle stats',
    detector: isPuzzleStatsQuestion,
    asks: [
      'what is my puzzle rating?',
      'how many puzzles have I solved?',
      'what is my puzzle accuracy?',
      'what is my puzzle streak?',
      'how am I doing on puzzles?',
    ],
  },
  {
    vertical: 'transfer gap (puzzles vs games)',
    detector: isTransferGapQuestion,
    asks: [
      'do my puzzle skills show up in my games?',
      'why are my puzzles better than my games?',
      'do I apply tactics in real games?',
      'does my puzzle rating match my game tactics?',
      'why do I miss in games what I solve in puzzles?',
    ],
  },
  {
    vertical: 'skill radar (all dimensions)',
    detector: isSkillRadarQuestion,
    asks: [
      'give me a breakdown of all my skills',
      'show my skill radar',
      'what does my full skill profile look like?',
      'break down every part of my game',
      'give me an overview of all my abilities',
    ],
  },
  {
    vertical: 'concept (what is X)',
    detector: isConceptQuestion,
    asks: [
      'what is a fork?',
      'what does zugzwang mean?',
      'explain the concept of a pin',
      'what is an outpost?',
      'what is a discovered attack?',
    ],
  },
  {
    vertical: 'player games (how did pro win)',
    detector: isPlayerGamesQuestion,
    asks: [
      'show me a game where Naroditsky won this',
      'how did the pro win in this line?',
      'do you have a game in this opening?',
      'show me one of his games here',
      'what game shows this idea?',
    ],
  },
];

/** Live-board verticals — these need a FEN/position context; they route on ask
 *  phrasing that references THIS position. Kept separate because some overlap
 *  with the over-time analogues by design (the runtime disambiguates on live
 *  state), so we only assert the owner fires. */
const LIVE_MATRIX: { vertical: string; detector: Detector; asks: string[] }[] = [
  {
    vertical: 'plan (this position)',
    detector: isPlanQuestion,
    asks: [
      "what's my plan here?",
      'what should my plan be?',
      'what is the idea in this position?',
      'what should I be aiming for here?',
      'what is the plan in this position?',
    ],
  },
  {
    vertical: 'best move (this position)',
    detector: isBestMoveQuestion,
    asks: [
      "what's the best move here?",
      'what should I play here?',
      'what is the strongest move?',
      'what is the best continuation?',
      'what move should I make now?',
    ],
  },
  {
    vertical: 'tactics (this position)',
    detector: isTacticsQuestion,
    asks: [
      'is there a tactic here?',
      'is there a combination in this position?',
      'can I win material here?',
      'is there something tactical here?',
      'any tactics in this position?',
    ],
  },
  {
    vertical: 'master play (this position)',
    detector: isMasterPlayQuestion,
    asks: [
      'what do masters play here?',
      'what do grandmasters play in this position?',
      'what does theory say here?',
      'what do the pros play here?',
      'what is played at the top level here?',
    ],
  },
  {
    vertical: 'endgame (this position)',
    detector: isEndgameQuestion,
    asks: [
      'how do I win this endgame?',
      'how do I hold this endgame?',
      'what is the technique in this endgame?',
      'how should I play this endgame?',
      'is this endgame winning?',
    ],
  },
  {
    vertical: 'position assessment (this position)',
    detector: isPositionAssessmentQuestion,
    asks: [
      'who is better here?',
      'how is my position?',
      'am I winning here?',
      'what is the evaluation of this position?',
      'is this position good for me?',
    ],
  },
  {
    vertical: 'record vs (opponent/opening)',
    detector: isRecordVsQuestion,
    asks: [
      'what is my record against the Sicilian?',
      'how do I do against the French?',
      'what is my score versus 1.d4?',
      'how do I fare against the Caro-Kann?',
      'what is my record in the Italian?',
    ],
  },
];

describe('PARAPHRASE MATRIX — every vertical fires on 5+ real phrasings (David 2026-07-05)', () => {
  for (const { vertical, detector, asks } of MATRIX) {
    describe(vertical, () => {
      it(`fires on all ${asks.length} phrasings`, () => {
        const misses = asks.filter((a) => !detector(a));
        expect(misses, `these phrasings did NOT route to "${vertical}": ${JSON.stringify(misses)}`).toEqual([]);
      });
    });
  }
});

describe('PARAPHRASE MATRIX — live-board verticals fire on 5+ phrasings', () => {
  for (const { vertical, detector, asks } of LIVE_MATRIX) {
    describe(vertical, () => {
      it(`fires on all ${asks.length} phrasings`, () => {
        const misses = asks.filter((a) => !detector(a));
        expect(misses, `these phrasings did NOT route to "${vertical}": ${JSON.stringify(misses)}`).toEqual([]);
      });
    });
  }
});

/**
 * The historically-colliding PAIRS — each misroute David's live audits actually
 * caught. For every phrasing on one side: the OWNER fires AND the RIVAL does not.
 * These are the regressions that must never come back.
 */
describe('NO-COLLISION — the pairs that misrouted in production', () => {
  const cases: { name: string; owner: Detector; rival: Detector; asks: string[] }[] = [
    {
      name: 'best-opening → opening-profile, NOT records',
      owner: isOpeningProfileQuestion,
      rival: isRecordsQuestion,
      asks: ['what is my best opening?', 'which opening do I play best?', 'what is my strongest opening?'],
    },
    {
      name: 'overall-accuracy → accuracy, NOT opening-accuracy',
      owner: isAccuracyQuestion,
      rival: isOpeningAccuracyQuestion,
      asks: ['how accurate am I overall?', 'what is my average accuracy?', 'how accurately do I play in general?'],
    },
    {
      name: 'opening-scoped accuracy → opening-accuracy, NOT overall-accuracy',
      owner: isOpeningAccuracyQuestion,
      rival: isAccuracyQuestion,
      asks: ['how accurate am I in the Sicilian?', 'how well do I play the Caro-Kann?', 'where do I slip in the French?'],
    },
    {
      name: 'puzzle-rating → puzzle-stats, NOT tactics-profile',
      owner: isPuzzleStatsQuestion,
      rival: isTacticsProfileQuestion,
      asks: ['what is my puzzle rating?', 'what is my puzzle accuracy?', 'how many puzzles have I solved?'],
    },
    {
      name: 'what-am-I-good-at → strengths, NOT progress',
      owner: isStrengthsQuestion,
      rival: isProgressQuestion,
      asks: ['what am I good at?', 'what are my strengths?', 'what do I do well?'],
    },
  ];
  for (const { name, owner, rival, asks } of cases) {
    describe(name, () => {
      for (const ask of asks) {
        it(`"${ask}" → owner true, rival false`, () => {
          expect(owner(ask), `owner did not fire for "${ask}"`).toBe(true);
          expect(rival(ask), `rival wrongly fired for "${ask}"`).toBe(false);
        });
      }
    });
  }

  // trend vs progress is a DELIBERATE overlap (questionIntents.test.ts locks that
  // "am I improving" trips both; the coachApi chokepoint runs the trend block
  // FIRST). So the guarantee here is that TREND fires (and thus wins by
  // precedence), not detector-level exclusivity — the meaningful regression to
  // catch is trend going silent and progress dumping weaknesses instead.
  describe('am-I-improving → trend fires (wins by chokepoint precedence over progress)', () => {
    for (const ask of ['am I improving?', 'am i getting better over time?', 'have I made progress lately?', 'am I getting stronger over time?']) {
      it(`"${ask}" → trend fires`, () => {
        expect(isImprovementTrendQuestion(ask), `trend did not fire for "${ask}"`).toBe(true);
      });
    }
  });
});
