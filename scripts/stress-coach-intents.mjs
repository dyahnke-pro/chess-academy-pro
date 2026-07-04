// Detector stress test (David 2026-07-04: "ask the same question in different
// ways … I want to know where it breaks"). For every grounded vertical, throw a
// battery of rephrasings — formal, casual, typo, abbreviated, partial,
// statement-vs-question — and report: (a) any phrasing that does NOT fire its
// expected detector (a routing BREAK), and (b) cross-detector collisions worth a
// look. Runs offline against the real detectors — instant, exhaustive. This is
// the fast inner loop; the prod Playwright audit confirms a sample end-to-end.
import {
  isStatsQuestion, isStrengthsQuestion, isProgressQuestion, isOpeningProfileQuestion,
  isOpeningAccuracyQuestion, isOpeningTrapsQuestion, isReviewDueQuestion,
  isMistakesQuestion, isTacticsProfileQuestion, isPhaseQuestion, isRepertoireGapQuestion,
  isBestMoveQuestion, isTacticsQuestion, isPositionAssessmentQuestion, isMasterPlayQuestion,
  isEndgameQuestion, isPlayerGamesQuestion, isConceptQuestion, isPlanQuestion,
} from '../src/coach/questionIntents.ts';

const DETECTORS = {
  stats: isStatsQuestion, strengths: isStrengthsQuestion, progress: isProgressQuestion,
  openingProfile: isOpeningProfileQuestion, openingAccuracy: isOpeningAccuracyQuestion,
  openingTraps: isOpeningTrapsQuestion, reviewDue: isReviewDueQuestion,
  mistakes: isMistakesQuestion, tacticsProfile: isTacticsProfileQuestion, phase: isPhaseQuestion,
  repertoireGap: isRepertoireGapQuestion, bestMove: isBestMoveQuestion, tacticsLive: isTacticsQuestion,
  positionAssessment: isPositionAssessmentQuestion, masterPlay: isMasterPlayQuestion,
  endgame: isEndgameQuestion, playerGames: isPlayerGamesQuestion, concept: isConceptQuestion, plan: isPlanQuestion,
};

// expected: the detector that SHOULD fire. Rephrasings hammer each vertical.
const BATTERY = [
  // ── STATS ──
  ['stats', ["what's my rating", 'whats my rating', 'my rating?', 'how good am I', 'what rating am I',
    "what's my record", 'my win/loss', 'how many games have I won', 'my win rate', 'whats my w/l',
    'how am I doing overall', 'my overall record', "what's my elo"]],
  // ── STRENGTHS ──
  ['strengths', ['what am I good at', 'what am i good at', 'what are my strengths', "what's my strong suit",
    'what do I do well', 'what am I best at', 'my strengths', 'what am I strong at', 'where do I excel']],
  // ── OPENING ACCURACY ──
  ['openingAccuracy', ['how accurate am I in my opening', "what's the weakest part of my opening theory",
    'which line should I work on', 'what part of my opening do I need to work on', "what's my weakest variation",
    'how well do I know my opening', 'improve my opening theory', "what's my accuracy in the Caro-Kann"]],
  // ── OPENING TRAPS ──
  ['openingTraps', ['what traps can I use in my strongest opening', 'what should I watch out for',
    'what are the traps in my repertoire', 'show me some opening traps', 'what traps should I know',
    'how do you teach these traps', 'what pitfalls should I avoid']],
  // ── REVIEW DUE ──
  ['reviewDue', ["what's due for review today", 'how many cards do I have to review', 'what should I review',
    'anything due', 'how many reps are due', 'review my cards', 'any flashcards due', 'whats in my review queue']],
  // ── MISTAKES ──
  ['mistakes', ['what mistakes do I make', 'what are my biggest mistakes', 'how often do I blunder',
    "what's my blunder rate", 'do I blunder a lot', 'where do I go wrong', 'what do I do wrong',
    "what's my worst blunder", 'do I make a lot of mistakes', 'how many blunders do I make']],
  // ── TACTICS PROFILE ──
  ['tacticsProfile', ['how are my tactics', 'what tactics do I miss', 'do I miss tactics',
    "what's my tactical awareness", 'am I good at tactics', 'what motif do I miss most', 'do I see tactics']],
  // ── PHASE ──
  ['phase', ['which phase am I weakest in', 'what phase do I lose in', 'where do I lose games',
    "how's my endgame play", 'how is my opening', 'how good is my middlegame',
    'am I better in the opening or endgame', "what's my worst phase"]],
  // ── REPERTOIRE GAP ──
  ['repertoireGap', ['where do I leave theory', 'where do I go out of book', 'what\'s a hole in my repertoire',
    'what do I have no answer for', 'what am I not prepared for', 'what do I struggle against',
    'what opening should I learn next', 'what should I add to my repertoire', 'what openings give me trouble']],

  // ═══ HARDER PASS — slang, typos, statements, terse, run-on (David: hit it harder) ═══
  ['stats', ['hows my record', 'gimme my stats', 'my w-l record', 'how many wins do i have',
    'am i winning more than losing', 'whats my score', 'my win percentage', 'how many games have i played']],
  ['strengths', ['what do i do best', 'whats my best skill', 'tell me what im good at',
    'what are my best areas', 'what am i great at']],
  ['mistakes', ['do i hang pieces', 'whats my error rate', 'what goes wrong in my games',
    'how much do i blunder', 'am i blundering a lot', 'what are my common blunders']],
  ['tacticsProfile', ['are my tactics any good', 'do i spot tactics', 'how good am i at tactics',
    'whats my tactic accuracy', 'do i overlook tactics']],
  ['phase', ['when do i lose', 'is my endgame weak', 'am i worse in the endgame',
    'what part of the game do i struggle with', 'where do i drop the ball']],
  ['reviewDue', ['whats due', 'do i have reviews', 'how many reviews today', 'anything to review',
    'reps due today']],
  ['openingAccuracy', ['how sharp is my opening prep', 'where am i weakest in my opening',
    'which variation do i need to work on']],
  ['repertoireGap', ['what am i unprepared for', 'wheres the gap in my prep', 'what should i learn next',
    'what do i need an answer to', 'what gives me the most trouble']],
  ['openingTraps', ['any traps in my openings', 'gimme traps for my repertoire', 'what should i look out for']],
];

// Which OTHER detectors firing on a phrasing count as a real misroute. The
// chokepoint order resolves some overlaps, so we only flag collisions that would
// win BEFORE the expected one, or are semantically wrong. Kept broad → reviewed.
let breaks = 0, collisions = 0, total = 0;
for (const [expected, phrasings] of BATTERY) {
  for (const p of phrasings) {
    total++;
    const fired = Object.entries(DETECTORS).filter(([, fn]) => fn(p)).map(([k]) => k);
    if (!fired.includes(expected)) {
      breaks++;
      console.log(`❌ BREAK   [${expected}] "${p}" → fired: ${fired.join(', ') || '(none)'}`);
      continue;
    }
    const others = fired.filter((k) => k !== expected);
    if (others.length) {
      collisions++;
      console.log(`⚠️  overlap [${expected}] "${p}" → also: ${others.join(', ')}`);
    }
  }
}
console.log(`\n${total} phrasings · ${breaks} BREAKS · ${collisions} overlaps to review`);
process.exit(breaks ? 1 : 0);
