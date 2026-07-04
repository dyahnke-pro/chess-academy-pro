// Weakness → question COVERAGE MATRIX (David 2026-07-04: "formulate and map
// questions based off of the weaknesses and double check that the coach can
// answer all possible questions"). For every metric the app computes on the
// weakness/insights surface, list the natural questions a user would ask, run
// them through the real detectors, and report which weaknesses the coach can
// answer vs the GAPS (a metric whose questions fire NO grounded vertical).
import * as Q from '../src/coach/questionIntents.ts';

const DETECTORS = {
  stats: Q.isStatsQuestion, strengths: Q.isStrengthsQuestion, progress: Q.isProgressQuestion,
  openingProfile: Q.isOpeningProfileQuestion, openingAccuracy: Q.isOpeningAccuracyQuestion,
  openingTraps: Q.isOpeningTrapsQuestion, reviewDue: Q.isReviewDueQuestion, mistakes: Q.isMistakesQuestion,
  tacticsProfile: Q.isTacticsProfileQuestion, phase: Q.isPhaseQuestion, repertoireGap: Q.isRepertoireGapQuestion,
  bestMove: Q.isBestMoveQuestion, tacticsLive: Q.isTacticsQuestion, positionAssessment: Q.isPositionAssessmentQuestion,
  masterPlay: Q.isMasterPlayQuestion, endgame: Q.isEndgameQuestion, playerGames: Q.isPlayerGamesQuestion,
  concept: Q.isConceptQuestion, plan: Q.isPlanQuestion,
  accuracy: Q.isAccuracyQuestion, consistency: Q.isConsistencyQuestion, converting: Q.isConvertingQuestion,
};
const fires = (q) => Object.entries(DETECTORS).filter(([, fn]) => fn(q)).map(([k]) => k);

// [metric, [questions...], expectedVertical|null]. expectedVertical=null means
// "no vertical exists yet" — a KNOWN gap we're tracking.
const MATRIX = [
  // ── COVERED (wired verticals) ──
  ['record / win-rate', ["what's my record", 'what\'s my win rate', 'how many games have I won'], 'stats'],
  ['rating', ["what's my rating", 'what rating am I', 'how strong am I'], 'stats'],
  ['strengths', ['what am I good at', "what's my forte", 'what do I do well'], 'strengths'],
  ['weaknesses / what to train', ['what are my weaknesses', 'what should I work on', "what's my biggest flaw"], 'progress'],
  ['opening profile', ["what's my best opening", 'my favorite opening', "what's my weakest opening"], 'openingProfile'],
  ['opening accuracy / weakest line', ['how accurate am I in my opening', 'weakest part of my opening theory', 'which line to work on'], 'openingAccuracy'],
  ['opening traps', ['what traps can I use', 'what should I watch out for'], 'openingTraps'],
  ['review due (SRS)', ["what's due for review", 'how many cards to review'], 'reviewDue'],
  ['blunder / mistake rate', ['how often do I blunder', 'what mistakes do I make', "what's costing me games"], 'mistakes'],
  ['errors by phase / situation', ['where do I go wrong', 'when do I blunder'], 'mistakes'],
  ['thrown wins / converting', ['do I throw away winning positions'], 'converting'],
  ['tactical awareness / missed motifs', ['how are my tactics', 'what tactics do I miss', 'am I sharp tactically'], 'tacticsProfile'],
  ['phase accuracy / where I lose', ['which phase am I weakest in', 'where do I lose games', "how's my endgame play"], 'phase'],
  ['critical-moment decisions', ['do I handle critical moments well'], 'phase'],
  ['repertoire coverage / off-book', ['where do I leave book', 'how often do I go off book'], 'repertoireGap'],
  ['repertoire holes / worst matchup', ["what's a hole in my repertoire", 'what do I struggle against', 'what to learn next'], 'repertoireGap'],

  // ── GAPS (metric computed, NO vertical yet — expected null) ──
  ['overall game accuracy', ['how accurate am I overall', "what's my accuracy", 'how precise is my play'], 'accuracy'],
  ['per-colour accuracy', ['how accurate am I', 'my accuracy'], 'accuracy'],
  ['best-move agreement', ['how often do I find the best move', 'how engine-like am I'], 'accuracy'],
  ['move-quality mix', ['how many brilliant moves do I make', "what's my move quality"], 'accuracy'],
  ['win/loss streak', ['am I on a streak', "what's my win streak", 'how consistent am I'], 'consistency'],
  ['best time control', ['what time control am I best at', 'am I better at blitz or rapid'], 'consistency'],
  ['activity / consistency', ['how often do I play', 'do I practice regularly'], 'consistency'],
  ['converting winning positions', ['do I convert winning positions', 'do I close out wins'], 'converting'],
  ['comeback wins', ['do I come back from losing positions', 'how often do I comeback'], 'converting'],
  ['win shape (quick/grind)', ['how do I win my games', 'am I a grinder or an attacker'], 'converting'],
  ['better as white or black', ['am I better as white or black', 'which colour do I do better with'], null],
  ['skill radar (5-axis)', ["what's my skill breakdown", 'rate my chess by skill', "what's my skill profile"], null],
  ['overall assessment', ['assess my chess', "what's your overall read on my game"], null],
  ['puzzle rating / solved', ["what's my puzzle rating", 'how many puzzles have I solved', 'my puzzle accuracy'], null],
  ['tactic transfer gap', ['do I spot tactics in games as well as puzzles', "what's my tactic transfer gap"], null],
  ['personal records / bests', ["what's my best game", 'my fastest win', 'my longest game', 'my best scalp'], null],
  ['record vs a specific opening', ['how do I do against the Sicilian', 'my record vs the French'], null],
  ['record vs a specific opponent', ['my record against Magnus', 'how do I do vs that player'], null],
  ['rate my last move', ['was that a good move', 'rate my last move'], null],
];

let covered = 0, gaps = 0, misroutes = 0;
const gapList = [];
console.log('METRIC → question coverage\n' + '─'.repeat(60));
for (const [metric, questions, expected] of MATRIX) {
  const results = questions.map((q) => ({ q, fired: fires(q) }));
  const allHitExpected = expected ? results.every((r) => r.fired.includes(expected)) : false;
  const anyFired = results.some((r) => r.fired.length > 0);
  if (expected && allHitExpected) {
    covered++;
    console.log(`✅ ${metric}  → ${expected}`);
  } else if (expected && !allHitExpected) {
    misroutes++;
    console.log(`⚠️  ${metric}  → expected ${expected} but some Qs miss:`);
    results.filter((r) => !r.fired.includes(expected)).forEach((r) => console.log(`     · "${r.q}" → ${r.fired.join(', ') || '(none)'}`));
  } else {
    // expected === null → GAP. Note if a wrong vertical fires (would misanswer).
    gaps++; gapList.push(metric);
    const stray = [...new Set(results.flatMap((r) => r.fired))];
    console.log(`❌ GAP: ${metric}  → no vertical${stray.length ? ` (stray: ${stray.join(', ')})` : ' (falls to general LLM)'}`);
  }
}
console.log('\n' + '─'.repeat(60));
console.log(`${covered} covered · ${gaps} GAPS · ${misroutes} partial-misroute`);
console.log(`\nGAP list (weaknesses the coach can't yet answer):\n  ${gapList.join('\n  ')}`);
