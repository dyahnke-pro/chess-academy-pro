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
  isAccuracyQuestion, isConsistencyQuestion, isConvertingQuestion,
  isColorQuestion, isRecordsQuestion, isRecordVsQuestion, isMoveRatingQuestion, isPuzzleStatsQuestion, isTransferGapQuestion, isSkillRadarQuestion,
} from '../src/coach/questionIntents.ts';

const DETECTORS = {
  stats: isStatsQuestion, strengths: isStrengthsQuestion, progress: isProgressQuestion,
  openingProfile: isOpeningProfileQuestion, openingAccuracy: isOpeningAccuracyQuestion,
  openingTraps: isOpeningTrapsQuestion, reviewDue: isReviewDueQuestion,
  mistakes: isMistakesQuestion, tacticsProfile: isTacticsProfileQuestion, phase: isPhaseQuestion,
  repertoireGap: isRepertoireGapQuestion, bestMove: isBestMoveQuestion, tacticsLive: isTacticsQuestion,
  positionAssessment: isPositionAssessmentQuestion, masterPlay: isMasterPlayQuestion,
  endgame: isEndgameQuestion, playerGames: isPlayerGamesQuestion, concept: isConceptQuestion, plan: isPlanQuestion,
  accuracy: isAccuracyQuestion, consistency: isConsistencyQuestion, converting: isConvertingQuestion,
  color: isColorQuestion, records: isRecordsQuestion, recordVs: isRecordVsQuestion, moveRating: isMoveRatingQuestion, puzzleStats: isPuzzleStatsQuestion, transferGap: isTransferGapQuestion, skillRadar: isSkillRadarQuestion,
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

  // ═══ PASS 3 — ENTIRELY DIFFERENT phrasings (David: run it again, different Qs) ═══
  ['stats', ["what's my level", 'how strong a player am i', "what's my chess rating",
    'do i win more than i lose', "how's my win rate", "what's my track record", 'am i any good']],
  ['strengths', ["what's my forte", 'what do i have going for me', 'what am i naturally good at',
    "what's working in my game", "what's my best quality"]],
  ['progress', ["what's my biggest flaw", 'what holds me back', 'what should i fix',
    "what's my achilles heel", 'what should i work on', 'how do i improve', 'what are my weaknesses']],
  ['openingProfile', ['which opening suits me best', "what's my bread and butter opening",
    'what do i open with most', "what's my go-to defense", "what's my best opening"]],
  ['openingAccuracy', ['am i solid in my openings', 'how deep is my opening knowledge',
    'do i know my openings well', 'where does my opening prep fall apart']],
  ['openingTraps', ['any tricks in my openings', 'what tricks can i play', 'how do i trap my opponent']],
  ['reviewDue', ["what's on my plate today for review", 'should i do my reps', 'how much review do i owe',
    'are my flashcards ready']],
  ['mistakes', ['what do i mess up', "where's my play sloppy", "what's costing me games",
    'do i drop pieces', 'what am i screwing up']],
  ['tacticsProfile', ['am i sharp tactically', "how's my tactical vision", 'do i find combinations',
    'am i missing shots']],
  ['phase', ['do i fade in long games', 'am i an opening or endgame player',
    'where does my game fall apart', 'which part of the game is my weakest']],
  ['repertoireGap', ["what's missing in my prep", 'which openings catch me off guard',
    'where am i exposed', 'what do opponents get me with']],

  // ═══ PASS 4 — ROBUSTNESS: caps, emoji, whitespace, terse, multi-intent ═══
  ['stats', ['WHAT IS MY RECORD', "what's my rating 🔥", '  my win rate  ', 'HOW AM I DOING OVERALL',
    "what's my rating and what am i weak at"]],   // multi-intent → stats runs first
  ['strengths', ['WHAT AM I GOOD AT', 'my strengths 💪', '  what are my strengths  ']],
  ['progress', ['WHAT ARE MY WEAKNESSES', 'my weaknesses', '  what should i work on  ', 'what am i weak at 😅']],
  ['mistakes', ['HOW OFTEN DO I BLUNDER', 'do i blunder a lot??', '  what mistakes do i make  ']],
  ['tacticsProfile', ['HOW ARE MY TACTICS', 'what tactics do i miss 👀']],
  ['phase', ['WHICH PHASE AM I WEAKEST IN', "how's my endgame and what should i review"]], // multi → phase first
  ['reviewDue', ["WHAT'S DUE FOR REVIEW TODAY", 'anything due??', '  how many cards are due  ']],
  ['repertoireGap', ['WHATS A HOLE IN MY REPERTOIRE', 'what opening should i learn next 🤔']],
  ['openingAccuracy', ['HOW ACCURATE AM I IN MY OPENING', '  which line should i work on  ']],

  // ═══ WAVE 3 detectors — accuracy / consistency / converting ═══
  ['accuracy', ['how accurate am i overall', "what's my accuracy", 'how precise is my play',
    'how often do i find the best move', 'how engine-like am i', "what's my move quality", 'how many brilliant moves']],
  ['consistency', ['am i on a streak', "what's my win streak", 'how consistent am i',
    'what time control am i best at', 'am i better at blitz or rapid', 'how often do i play', 'my best time control']],
  ['converting', ['do i convert winning positions', 'do i close out wins', 'do i throw away winning positions',
    'do i come back from losing positions', 'how do i win my games', 'am i a grinder or attacker']],

  // ═══ RECORD-VS — opening OR opponent (the target is captured, disambiguated
  //     at the interception: resolves as an opening else an opponent). ═══
  ['recordVs', ['how do i do against the Sicilian', 'my record vs the French', "what's my record in the Najdorf",
    'how do i fare against the Caro-Kann', 'results against the Italian', 'how do i perform vs the Dutch',
    'my record against Magnus', 'how do i do versus Hikaru', 'results against DrNykterstein',
    'how do i fare vs that player', "what's my head to head with Nakamura", 'my win rate against the London',
    'HOW DO I DO AGAINST THE SICILIAN', '  my record vs the french  ']],

  // ═══ MOVE RATING — "was that a good move?" (board-dependent; rates the
  //     move just played). MUST stay distinct from bestMove ("what SHOULD I play"). ═══
  ['moveRating', ['was that a good move', 'was that a good move?', 'rate my last move', 'was that a blunder',
    'was that a mistake', 'how good was that move', 'was my last move good', 'was my move a mistake',
    'did i play that right', 'grade my move', 'was that the best move', 'rate my move',
    'WAS THAT A GOOD MOVE', '  rate my last move  ']],
];

// GARBAGE / non-questions — MUST match NOTHING (false-positive guard).
const GARBAGE = [
  'asdf', '???', 'hello there', 'lol', '🔥🔥🔥', '12345', 'the the the', 'ok', 'thanks',
  'chess', 'nice', 'hmm', 'what', 'yes', 'no', 'good game', 'gg', 'brb', '.....', 'a',
];

// TYPOS — INFORMATIONAL only (regex can't fuzzy-match; these fall through to the
// LLM, which still answers — an acceptable degradation, flagged not failed).
const TYPOS = [
  ['stats', 'whats my raiting'], ['progress', 'what are my wekainesses'], ['mistakes', 'my blunder rait'],
  ['phase', 'hows my endgaem'], ['tacticsProfile', 'how are my tactcs'], ['repertoireGap', 'hole in my reprtoire'],
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
// GARBAGE — a false positive (any vertical firing on noise) IS a break.
let falsePos = 0;
for (const g of GARBAGE) {
  const fired = Object.entries(DETECTORS).filter(([, fn]) => fn(g)).map(([k]) => k);
  if (fired.length) { falsePos++; breaks++; console.log(`❌ FALSE-POS "${g}" → fired: ${fired.join(', ')}`); }
}

// TYPOS — informational (miss = falls through to LLM, acceptable).
let typoMiss = 0;
for (const [expected, t] of TYPOS) {
  const fired = Object.entries(DETECTORS).filter(([, fn]) => fn(t)).map(([k]) => k);
  if (!fired.includes(expected)) { typoMiss++; console.log(`ℹ️  typo-miss [${expected}] "${t}" → ${fired.join(', ') || '(none)'} (falls through to LLM)`); }
}

console.log(`\n${total} phrasings · ${breaks} BREAKS (${falsePos} false-pos) · ${collisions} overlaps · ${typoMiss}/${TYPOS.length} typo-miss (informational)`);
process.exit(breaks ? 1 : 0);
