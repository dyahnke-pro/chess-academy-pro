/**
 * THE COACH QUESTION MATRIX (David 2026-07-09: "list out all of the questions.
 * Use a question matrix. All parts of the app. All actions we expect the coach
 * to make. If it comes back with the stock answer we track it down and plug it
 * in.").
 *
 * Every question the app is capable of answering from its DETERMINISTIC data,
 * plus every ACTION the coach is expected to take, one row per capability. The
 * exhaustive audit drives EVERY row; any row that comes back with the stock
 * "I can only speak to what I can verify" line (instead of its rich assembler /
 * action) is a WIRING GAP to track down and plug in.
 *
 * `lane` = the grounded lane this row MUST hit (its assembler id or the action
 * kind). `needsData` = the row only grounds when the named Dexie/profile data is
 * present (the audit seeds it); a cold cache legitimately falls to the safe
 * default, which is NOT a wiring bug — but with data present it MUST ground.
 */

// ── A. LIVE-BOARD Q&A (need a FEN; engine/tactics threaded) ──────────────────
export const LIVE_BOARD = [
  { id: 'position-assessment', lane: 'assemblePositionAssessment', needsData: 'fen+eval', qs: ["who's winning?", 'how do I stand here?', 'is this position winning for me?', 'am I losing?', "what's the eval?"] },
  { id: 'best-move', lane: 'assembleMoveEvalAnswer', needsData: 'fen+engineBestMove', qs: ["what's my best move?", 'what should I play here?', 'best move?'] },
  { id: 'plan', lane: 'assemblePlanAnswer', needsData: 'fen+enginePV', qs: ["what's my plan here?", "what's the idea in this position?", 'what should my plan be?'] },
  { id: 'tactics-live', lane: 'assembleTacticsAnswer', needsData: 'fen+tactics', qs: ['are there any tactics here?', 'is anything hanging?', 'is there a fork?', 'am I safe here?'] },
  { id: 'master-play', lane: 'assembleMasterPlayAnswer', needsData: 'fen+masterPlay', qs: ['what do masters play here?', 'what does theory say here?'] },
  { id: 'player-games', lane: 'assemblePlayerGamesAnswer', needsData: 'fen+playerGames', qs: ['how does he play this line?', 'show me his games here', 'what did he play here?'] },
  { id: 'endgame-tablebase', lane: 'assembleEndgameAnswer', needsData: 'endgame-fen+tablebase', qs: ['how do I win this endgame?', 'is this endgame winning?'] },
  { id: 'move-rating', lane: 'assembleMoveRatingAnswer', needsData: 'lastMove+eval', qs: ['was that a good move?', 'rate my last move', 'how was that move?'] },
];

// ── B. SELF-KNOWLEDGE Q&A (need the student's game/puzzle history in Dexie) ───
export const SELF_KNOWLEDGE = [
  { id: 'weakness', lane: 'assembleWeaknessRecommendation', needsData: 'badHabits', qs: ['what are my weaknesses?', 'what should I work on?', 'where do I go wrong?'] },
  { id: 'progress', lane: 'assembleProgressAnswer', needsData: 'badHabits', qs: ['am I improving?', 'how am I doing?', 'what are my bad habits?'] },
  { id: 'trend', lane: 'assembleTrendAnswer', needsData: 'games', qs: ["what's my rating trend?", 'am I getting better over time?', 'how has my rating moved?'] },
  { id: 'stats', lane: 'assembleStatsAnswer', needsData: 'games+profile', qs: ["what's my rating?", 'how many games have I played?', "what's my win rate?"] },
  { id: 'strengths', lane: 'assembleStrengthsAnswer', needsData: 'openingProfile', qs: ['what am I good at?', 'what are my strengths?'] },
  { id: 'opening-profile', lane: 'assembleOpeningProfileAnswer', needsData: 'openingProfile', qs: ["what's my best opening?", 'my strongest opening', "what's my weakest opening?"] },
  { id: 'opening-accuracy', lane: 'assembleOpeningAccuracyAnswer', needsData: 'openingProfile', qs: ['how accurate am I in the Caro-Kann?', 'how well do I play the Italian?'] },
  { id: 'opening-traps', lane: 'assembleOpeningTrapsAnswer', needsData: 'repertoire', qs: ['what traps can I play in the Italian?', 'what traps should I watch for in the Caro?'] },
  { id: 'opening-record', lane: 'assembleOpeningRecordAnswer', needsData: 'games', qs: ['how do I do against the Sicilian?', "what's my record in the French?"] },
  { id: 'opponent-record', lane: 'assembleOpponentRecordAnswer', needsData: 'games', qs: ['my record against Magnus', 'how do I do against iankane21?'] },
  { id: 'review-due', lane: 'assembleReviewDueAnswer', needsData: 'flashcards', qs: ["what's due for review?", 'any reviews?', 'do I have cards to review?'] },
  { id: 'mistakes', lane: 'assembleMistakesAnswer', needsData: 'mistakePuzzles', qs: ['what mistakes do I make?', 'how often do I blunder?', "what's my blunder rate?"] },
  { id: 'tactics-profile', lane: 'assembleTacticsProfileAnswer', needsData: 'themeSkills', qs: ['how are my tactics?', "what's my weakest tactic?", 'what tactics do I miss?'] },
  { id: 'phase-profile', lane: 'assemblePhaseProfileAnswer', needsData: 'games', qs: ['which phase am I weakest in?', 'where do I lose games?', 'how is my endgame play?'] },
  { id: 'repertoire-gap', lane: 'assembleRepertoireGapAnswer', needsData: 'repertoire+games', qs: ['where are the gaps in my repertoire?', 'what should I add to my repertoire?'] },
  { id: 'accuracy', lane: 'assembleAccuracyAnswer', needsData: 'games', qs: ["what's my accuracy?", 'how accurate am I overall?'] },
  { id: 'consistency', lane: 'assembleConsistencyAnswer', needsData: 'games', qs: ['how consistent am I?', 'am I streaky?'] },
  { id: 'converting', lane: 'assembleConvertingAnswer', needsData: 'games', qs: ['how good am I at converting winning positions?', 'do I convert my advantages?'] },
  { id: 'color', lane: 'assembleColorAnswer', needsData: 'games', qs: ['am I better as White or Black?', 'which color do I play better?'] },
  { id: 'records', lane: 'assembleRecordsAnswer', needsData: 'games', qs: ["what's my best win?", 'my records', 'my longest win streak'] },
  { id: 'record-vs-target', lane: 'recordVsTarget', needsData: 'games', qs: ['how do I score against the Sicilian?', 'my results versus the French', 'how do I do against d4?'] },
  { id: 'puzzle-stats', lane: 'assemblePuzzleStatsAnswer', needsData: 'puzzles', qs: ["what's my puzzle rating?", 'how many puzzles have I solved?'] },
  { id: 'transfer-gap', lane: 'assembleTransferGapAnswer', needsData: 'puzzles+games', qs: ['do my tactics transfer to games?', "why don't my puzzles help my games?"] },
  { id: 'skill-radar', lane: 'assembleSkillRadarAnswer', needsData: 'skillRadar', qs: ['show my skill radar', 'break down my skills'] },
];

// ── C. KNOWLEDGE / PEDAGOGY Q&A (no student data needed) ──────────────────────
export const KNOWLEDGE = [
  { id: 'concept', lane: 'assembleConceptAnswer', needsData: null, qs: ["what's a fork?", 'explain the back-rank mate', 'what is a zwischenzug?', 'what is an outpost?'] },
  { id: 'teaching-method', lane: 'assembleTeachingAnswer', needsData: null, qs: ['how do you teach the Caro-Kann?', 'how do you teach the Vienna?'] },
  { id: 'settings-query', lane: 'assembleSettingsAnswer', needsData: null, qs: ['is voice on?', "what's my narration level?", 'what are my settings?', 'is my voice narration on?'] },
  { id: 'app-help', lane: 'assembleAppHelpAnswer', needsData: null, qs: ['what does the Tactics tab do?', 'how does the Calculation trainer work?', "what's the Weaknesses tab for?"] },
];

// ── D. ACTIONS the coach is expected to TAKE (routeChatIntent → nav/settings/session) ──
export const ACTIONS = [
  { id: 'navigate', kind: 'navigate', qs: ['take me to tactics', 'open settings', 'go to my weaknesses', 'show me the openings', 'take me to the review page', 'open the tactics trainer'] },
  { id: 'set-voice', kind: 'settings-mutation', qs: ['turn on voice narration', 'turn off voice', 'mute the coach'] },
  { id: 'set-verbosity', kind: 'settings-mutation', qs: ['set narration to brief', 'set verbosity to full', 'make the coach silent'] },
  { id: 'set-hints', kind: 'settings-mutation', qs: ['enable hints', 'turn off hints'] },
  { id: 'set-premium-voice', kind: 'settings-mutation', qs: ['turn on premium voice', 'use the natural voice'] },
  { id: 'set-theme', kind: 'settings-mutation', qs: ['switch to dark theme', 'switch to light mode', 'use the midnight theme'] },
  { id: 'play-against', kind: 'session-start', qs: ['play the Caro-Kann against me', "let's play the Sicilian", 'play a game with me in the Italian'] },
  { id: 'teach-opening', kind: 'teach', qs: ['teach me the Vienna', 'walk me through the Najdorf', 'teach me the London'] },
  // KNOWN GAP (task #19 — unified action layer): drill/quiz/trap commands route
  // on the /coach/teach STAGE router, not the general chat router yet. Tracked,
  // not a regression — surfaced by the audit as a known gap to build.
  { id: 'drill-stage', kind: 'drill', knownGap: 'task-19', qs: ['drill the Italian', 'quiz me on the French', 'give me a trap in the Caro-Kann'] },
  { id: 'training-aid', kind: 'training', qs: ['give me a fork puzzle', 'drill my weaknesses', 'let me practice endgames'] },
];

// The full matrix, flattened, with a category tag.
export const QUESTION_MATRIX = [
  ...LIVE_BOARD.map((r) => ({ ...r, cat: 'live-board' })),
  ...SELF_KNOWLEDGE.map((r) => ({ ...r, cat: 'self-knowledge' })),
  ...KNOWLEDGE.map((r) => ({ ...r, cat: 'knowledge' })),
  ...ACTIONS.map((r) => ({ ...r, cat: 'action' })),
];

// Flatten to individual (question, expected-lane) probes.
export const ALL_PROBES = QUESTION_MATRIX.flatMap((r) =>
  r.qs.map((q) => ({ q, lane: r.lane ?? r.kind, id: r.id, cat: r.cat, needsData: r.needsData ?? null })),
);
