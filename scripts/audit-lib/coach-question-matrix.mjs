/**
 * THE COACH QUESTION MATRIX (David 2026-07-09: "list out all of the questions.
 * Use a question matrix. All parts of the app. All actions we expect the coach
 * to make. If it comes back with the stock answer we track it down and plug it
 * in." + "ask each question in multiple ways. At least three different ways for
 * each question on the first pass. Then it gets harder with different questions
 * on the second pass. But each pass is all questions and actions three
 * different ways").
 *
 * Every question the app is capable of answering from its DETERMINISTIC data,
 * plus every ACTION the coach is expected to take, one row per capability. The
 * exhaustive audit drives EVERY row across MULTIPLE PASSES; any phrasing that
 * comes back with the stock "I can only speak to what I can verify" line
 * (instead of its rich assembler / action) is a WIRING GAP to track down and
 * plug in.
 *
 * MULTI-PASS STRUCTURE (David's spec):
 *   `qs`  — PASS 1: ≥3 different, natural phrasings of the capability.
 *   `qs2` — PASS 2: ≥3 HARDER / different phrasings — oblique wording, typos,
 *           British spellings, abbreviations, indirect asks, casual register —
 *           the messy-human tier that a canonical-only audit never probes.
 * Each pass drives the SAME set of capabilities, worded a different (and
 * harder) way, so a router that only matches the textbook phrasing is exposed.
 *
 * `lane` = the grounded lane this row MUST hit (its assembler id or the action
 * kind). `needsData` = the row only grounds when the named Dexie/profile data is
 * present (the audit seeds it); a cold cache legitimately falls to the safe
 * default, which is NOT a wiring bug — but with data present it MUST ground.
 */

// ── A. LIVE-BOARD Q&A (need a FEN; engine/tactics threaded) ──────────────────
export const LIVE_BOARD = [
  {
    id: 'position-assessment', lane: 'assemblePositionAssessment', needsData: 'fen+eval',
    qs: ["who's winning?", 'how do I stand here?', 'is this position winning for me?', 'am I losing?', "what's the eval?"],
    qs2: ['am I better or worse right now?', 'who has the edge in this position?', 'how bad is it for me here?', 'is this equal or am I in trouble?'],
  },
  {
    id: 'best-move', lane: 'assembleMoveEvalAnswer', needsData: 'fen+engineBestMove',
    qs: ["what's my best move?", 'what should I play here?', 'best move?'],
    qs2: ['what would the engine play here?', 'give me the strongest continuation', 'what move should I make now?', 'top move in this spot?'],
  },
  {
    id: 'plan', lane: 'assemblePlanAnswer', needsData: 'fen+enginePV',
    qs: ["what's my plan here?", "what's the idea in this position?", 'what should my plan be?'],
    qs2: ['what am I trying to do here?', 'how should I proceed from this position?', 'where do my pieces belong?', "what's the long-term idea?"],
  },
  {
    id: 'tactics-live', lane: 'assembleTacticsAnswer', needsData: 'fen+tactics',
    qs: ['are there any tactics here?', 'is anything hanging?', 'is there a fork?', 'am I safe here?'],
    qs2: ['any combinations in this position?', 'is there a tactic I can play?', 'did I leave anything en prise?', 'is my king safe here?'],
  },
  {
    id: 'master-play', lane: 'assembleMasterPlayAnswer', needsData: 'fen+masterPlay',
    qs: ['what do masters play here?', 'what does theory say here?', 'what is the main line from here?'],
    qs2: ['what do the grandmasters do in this position?', "what's book here?", 'how is this position handled at the top level?'],
  },
  {
    id: 'player-games', lane: 'assemblePlayerGamesAnswer', needsData: 'fen+playerGames',
    qs: ['how does he play this line?', 'show me his games here', 'what did he play here?'],
    qs2: ['what does the pro do in this exact position?', 'pull up his games from this spot', 'how did he handle this line in his own games?'],
  },
  {
    id: 'endgame-tablebase', lane: 'assembleEndgameAnswer', needsData: 'endgame-fen+tablebase',
    qs: ['how do I win this endgame?', 'is this endgame winning?', 'can I hold this ending?'],
    qs2: ['is this endgame a draw or a win?', "what's the technique to convert here?", 'how do I not lose this ending?'],
  },
  {
    id: 'move-rating', lane: 'assembleMoveRatingAnswer', needsData: 'lastMove+eval',
    qs: ['was that a good move?', 'rate my last move', 'how was that move?'],
    qs2: ['did I just blunder?', 'was my last move a mistake?', 'how bad was that move I played?'],
  },
];

// ── B. SELF-KNOWLEDGE Q&A (need the student's game/puzzle history in Dexie) ───
export const SELF_KNOWLEDGE = [
  {
    id: 'weakness', lane: 'assembleWeaknessRecommendation', needsData: 'badHabits',
    qs: ['what are my weaknesses?', 'what should I work on?', 'where do I go wrong?'],
    qs2: ["what's the weakest part of my game?", 'what do I need to fix?', 'where am I leaking points?'],
  },
  {
    id: 'progress', lane: 'assembleProgressAnswer', needsData: 'badHabits',
    qs: ['am I improving?', 'how am I doing?', 'what are my bad habits?'],
    qs2: ['am I actually getting any better?', 'how has my play been lately?', 'what bad patterns keep showing up?'],
  },
  {
    id: 'trend', lane: 'assembleTrendAnswer', needsData: 'games',
    qs: ["what's my rating trend?", 'am I getting better over time?', 'how has my rating moved?'],
    qs2: ['is my rating going up or down?', 'how has my rating changed recently?', 'am I trending up?'],
  },
  {
    id: 'stats', lane: 'assembleStatsAnswer', needsData: 'games+profile',
    qs: ["what's my rating?", 'how many games have I played?', "what's my win rate?"],
    qs2: ['how many wins do I have?', 'what am I rated?', 'how often do I win?'],
  },
  {
    id: 'strengths', lane: 'assembleStrengthsAnswer', needsData: 'openingProfile',
    qs: ['what am I good at?', 'what are my strengths?', "what's the strongest part of my game?"],
    qs2: ['where do I play well?', 'what do I do best over the board?', 'what are my best skills?'],
  },
  {
    id: 'opening-profile', lane: 'assembleOpeningProfileAnswer', needsData: 'openingProfile',
    qs: ["what's my best opening?", 'my strongest opening', "what's my weakest opening?"],
    qs2: ['which opening do I score best with?', 'what opening should I stop playing?', 'which of my openings is letting me down?'],
  },
  {
    id: 'opening-accuracy', lane: 'assembleOpeningAccuracyAnswer', needsData: 'openingProfile',
    qs: ['how accurate am I in the Caro-Kann?', 'how well do I play the Italian?', 'how good is my Sicilian?'],
    qs2: ['how clean is my Caro-Kann play?', 'do I play the French accurately?', "what's my accuracy in the London?"],
  },
  {
    id: 'opening-traps', lane: 'assembleOpeningTrapsAnswer', needsData: 'repertoire',
    qs: ['what traps can I play in the Italian?', 'what traps should I watch for in the Caro?', 'any traps in the Vienna?'],
    qs2: ['what tricks are there in the Italian?', 'how do I get tricked in the Caro-Kann?', 'what should I set up as a trap in the French?'],
  },
  {
    id: 'opening-record', lane: 'assembleOpeningRecordAnswer', needsData: 'games',
    qs: ['how do I do against the Sicilian?', "what's my record in the French?", 'how do I score in the Caro?'],
    qs2: ['do I struggle against the Sicilian?', 'am I any good in the French?', 'how have I done playing the London?'],
  },
  {
    id: 'opponent-record', lane: 'assembleOpponentRecordAnswer', needsData: 'games',
    qs: ['my record against Magnus', 'how do I do against iankane21?', 'my head to head with hikaru'],
    qs2: ['have I ever beaten iankane21?', 'how many times have I lost to Magnus?', "what's my score versus that guy?"],
  },
  {
    id: 'review-due', lane: 'assembleReviewDueAnswer', needsData: 'flashcards',
    qs: ["what's due for review?", 'any reviews?', 'do I have cards to review?'],
    qs2: ['is there anything to study today?', 'how many flashcards are waiting?', 'do I need to do my reviews?'],
  },
  {
    id: 'mistakes', lane: 'assembleMistakesAnswer', needsData: 'mistakePuzzles',
    qs: ['what mistakes do I make?', 'how often do I blunder?', "what's my blunder rate?"],
    qs2: ['what kind of errors do I keep making?', 'do I blunder a lot?', 'what are my most common mistakes?'],
  },
  {
    id: 'tactics-profile', lane: 'assembleTacticsProfileAnswer', needsData: 'themeSkills',
    qs: ['how are my tactics?', "what's my weakest tactic?", 'what tactics do I miss?'],
    qs2: ['which tactical motif do I struggle with?', 'am I good at tactics?', 'what tactics should I drill?'],
  },
  {
    id: 'phase-profile', lane: 'assemblePhaseProfileAnswer', needsData: 'games',
    qs: ['which phase am I weakest in?', 'where do I lose games?', 'how is my endgame play?'],
    qs2: ['do I lose in the opening, middlegame, or endgame?', 'which stage of the game hurts me most?', 'is my middlegame the problem?'],
  },
  {
    id: 'repertoire-gap', lane: 'assembleRepertoireGapAnswer', needsData: 'repertoire+games',
    qs: ['where are the gaps in my repertoire?', 'what should I add to my repertoire?', 'what am I missing in my openings?'],
    qs2: ['what lines do I need to learn?', 'where is my repertoire thin?', 'what openings should I prepare next?'],
  },
  {
    id: 'accuracy', lane: 'assembleAccuracyAnswer', needsData: 'games',
    qs: ["what's my accuracy?", 'how accurate am I overall?', 'what accuracy do I average?'],
    qs2: ['how precise is my play?', 'do I play accurately?', "what's my average accuracy across games?"],
  },
  {
    id: 'consistency', lane: 'assembleConsistencyAnswer', needsData: 'games',
    qs: ['how consistent am I?', 'am I streaky?', 'is my play steady?'],
    qs2: ['do I play the same level every game?', 'am I all over the place?', 'how reliable is my play?'],
  },
  {
    id: 'converting', lane: 'assembleConvertingAnswer', needsData: 'games',
    qs: ['how good am I at converting winning positions?', 'do I convert my advantages?', 'do I close out won games?'],
    qs2: ['do I throw away winning positions?', 'can I finish off a winning game?', 'do I let wins slip?'],
  },
  {
    id: 'color', lane: 'assembleColorAnswer', needsData: 'games',
    qs: ['am I better as White or Black?', 'which color do I play better?', 'do I score more with White?'],
    qs2: ['is White or Black my stronger side?', 'do I struggle with the black pieces?', 'which side suits me?'],
  },
  {
    id: 'records', lane: 'assembleRecordsAnswer', needsData: 'games',
    qs: ["what's my best win?", 'my records', 'my longest win streak'],
    qs2: ['who is the highest-rated player I have beaten?', 'what was my biggest upset?', 'how long is my best streak?'],
  },
  {
    id: 'record-vs-target', lane: 'recordVsTarget', needsData: 'games',
    qs: ['how do I score against the Sicilian?', 'my results versus the French', 'how do I do against d4?'],
    qs2: ['am I winning against 1.e4?', 'how do I fare facing the Sicilian?', "what's my score with d4 openings?"],
  },
  {
    id: 'puzzle-stats', lane: 'assemblePuzzleStatsAnswer', needsData: 'puzzles',
    qs: ["what's my puzzle rating?", 'how many puzzles have I solved?', "what's my tactics rating?"],
    qs2: ['how good is my puzzle rush?', 'how many tactics have I done?', "what's my puzzle score?"],
  },
  {
    id: 'transfer-gap', lane: 'assembleTransferGapAnswer', needsData: 'puzzles+games',
    qs: ['do my tactics transfer to games?', "why don't my puzzles help my games?", 'do puzzles improve my games?'],
    qs2: ['why am I good at puzzles but bad in games?', 'does my puzzle skill show up over the board?', "why don't my tactics carry into real games?"],
  },
  {
    id: 'skill-radar', lane: 'assembleSkillRadarAnswer', needsData: 'skillRadar',
    qs: ['show my skill radar', 'break down my skills', 'what does my skill profile look like?'],
    qs2: ['give me the full breakdown of my abilities', 'map out all my skills', 'where do all my skills sit?'],
  },
];

// ── C. KNOWLEDGE / PEDAGOGY Q&A (no student data needed) ──────────────────────
export const KNOWLEDGE = [
  {
    id: 'concept', lane: 'assembleConceptAnswer', needsData: null,
    qs: ["what's a fork?", 'explain the back-rank mate', 'what is a zwischenzug?', 'what is an outpost?'],
    qs2: ['what does en prise mean?', 'explain a discovered attack', 'what is a skewer?', 'what does zugzwang mean?'],
  },
  {
    id: 'teaching-method', lane: 'assembleTeachingAnswer', needsData: null,
    qs: ['how do you teach the Caro-Kann?', 'how do you teach the Vienna?', 'how does this app teach the Italian?'],
    qs2: ['walk me through how you teach the French', "what's your method for teaching the London?", 'how would you break down teaching the Sicilian?'],
  },
  {
    id: 'settings-query', lane: 'assembleSettingsAnswer', needsData: null,
    qs: ['is voice on?', "what's my narration level?", 'what are my settings?', 'is my voice narration on?'],
    qs2: ['do I have the voice turned on?', 'how verbose is my narration set?', 'what theme am I using?'],
  },
  {
    id: 'app-help', lane: 'assembleAppHelpAnswer', needsData: null,
    qs: ['what does the Tactics tab do?', 'how does the Calculation trainer work?', "what's the Weaknesses tab for?"],
    qs2: ['what is the openings section for?', 'how do I use the review tab?', 'what can I do on the play page?'],
  },
];

// ── D. ACTIONS the coach is expected to TAKE (routeChatIntent → nav/settings/session) ──
export const ACTIONS = [
  {
    id: 'navigate', kind: 'navigate',
    qs: ['take me to tactics', 'open settings', 'go to my weaknesses', 'show me the openings', 'take me to the review page', 'open the tactics trainer'],
    qs2: ['bring up the settings page', 'jump to my game database', 'navigate to the calculation trainer', 'switch to the openings explorer', 'go home', 'pull up my mistakes'],
  },
  {
    id: 'set-voice', kind: 'settings-mutation',
    qs: ['turn on voice narration', 'turn off voice', 'mute the coach'],
    qs2: ['enable the voice', 'stop talking to me', 'silence the coach'],
  },
  {
    id: 'set-verbosity', kind: 'settings-mutation',
    qs: ['set narration to brief', 'set verbosity to full', 'make the coach silent'],
    qs2: ['keep the narration short', 'give me detailed narration', 'switch narration to concise'],
  },
  {
    id: 'set-hints', kind: 'settings-mutation',
    qs: ['enable hints', 'turn off hints', 'show me hints'],
    qs2: ['I want hints on', 'disable the hints', 'stop showing hints'],
  },
  {
    id: 'set-premium-voice', kind: 'settings-mutation',
    qs: ['turn on premium voice', 'use the natural voice', 'enable the polly voice'],
    qs2: ['switch to the better voice', 'turn off the premium voice', 'use the device voice instead'],
  },
  {
    id: 'set-theme', kind: 'settings-mutation',
    qs: ['switch to dark theme', 'switch to light mode', 'use the midnight theme'],
    qs2: ['go dark', 'make it light', 'put it in night mode'],
  },
  {
    id: 'play-against', kind: 'session-start',
    qs: ['play the Caro-Kann against me', "let's play the Sicilian", 'play a game with me in the Italian'],
    qs2: ['spar with me in the French', 'can we play out the London?', 'play against me in the Vienna'],
  },
  {
    id: 'teach-opening', kind: 'teach',
    qs: ['teach me the Vienna', 'walk me through the Najdorf', 'teach me the London'],
    qs2: ['show me how the Caro-Kann works', 'I want to learn the French', 'go through the Italian with me'],
  },
  {
    // parseCoachIntent → 'review-game' (needs a recency marker: last/latest/
    // most-recent/previous). routeChatIntent returns a /coach/review route.
    id: 'review-game', kind: 'review-game',
    qs: ['review my last game', 'go over my last game', 'walk me through my most recent game'],
    qs2: ['recap my latest game', 'run me through my previous game', 'narrate my last game'],
  },
  {
    // parseCoachIntent → 'explain-position' (needs currentFen). This is the
    // ACTION that reaches assembleGameReviewAnswer / position-assessment on the
    // explain surface.
    id: 'explain-position', kind: 'explain-position',
    qs: ['explain this position', 'break down this position', "what's going on here"],
    qs2: ['analyze this position', 'evaluate this', "what's happening here"],
  },
  {
    // parseCoachIntent → 'continue-middlegame' (routes to a plan; carry a
    // subject so the deterministic resolver finds a DB plan, not a null).
    id: 'continue-middlegame', kind: 'continue-middlegame',
    qs: ['continue the middlegame in the Italian', 'show me the middlegame plan for the Caro-Kann', 'run me through the middlegame of the French'],
    qs2: ['walk me through the Sicilian middlegame', 'teach the middlegame plan in the Vienna', 'continue the London middlegame'],
  },
  // ── KNOWN GAPS (task #19 — unified action layer) ─────────────────────────
  // These are REAL coach actions (they fire via the agentic tool loop today),
  // but they do NOT route through the deterministic `routeChatIntent` pre-pass
  // yet, so the audit surfaces them as gaps to build into the shared router —
  // exactly the "if it comes back stock, track it down and plug it in" mandate.
  {
    // drill/quiz/trap commands route on the /coach/teach STAGE router, not the
    // general chat router yet.
    id: 'drill-stage', kind: 'drill', knownGap: 'task-19',
    qs: ['drill the Italian', 'quiz me on the French', 'give me a trap in the Caro-Kann'],
    qs2: ['test me on the Vienna', 'run me through Italian drills', 'quiz my Sicilian'],
  },
  {
    // favorite_opening TOOL exists; the deterministic router has no case yet.
    id: 'favorite-opening', kind: 'favorite-opening', knownGap: 'task-19',
    qs: ['favorite the Caro-Kann', 'star the Vienna', 'add the Italian to my favorites'],
    qs2: ['bookmark the French', 'favourite the London', 'add the Sicilian to my favourites'],
  },
  {
    // save_opening_to_repertoire / set_intended_opening TOOLs exist; no
    // deterministic router case.
    id: 'manage-repertoire', kind: 'repertoire', knownGap: 'task-19',
    qs: ['add the Vienna to my repertoire', 'save the Caro-Kann to my repertoire', "I'm going to play the London"],
    qs2: ['put the Italian in my repertoire', 'set my opening to the French', 'lock in the Sicilian as my opening'],
  },
  {
    // take_back_move / reset_board / save_position / restore_saved_position
    // TOOLs exist; no deterministic router case.
    id: 'board-control', kind: 'board', knownGap: 'task-19',
    qs: ['take that back', 'undo my move', 'reset the board'],
    qs2: ['let me take that move back', 'start the position over', 'clear the board'],
  },
  {
    id: 'training-aid', kind: 'training',
    qs: ['give me a fork puzzle', 'drill my weaknesses', 'let me practice endgames'],
    qs2: ['I want a pin puzzle', 'work on my weak spots', 'practice some rook endings'],
  },
];

// The full matrix, flattened, with a category tag.
export const QUESTION_MATRIX = [
  ...LIVE_BOARD.map((r) => ({ ...r, cat: 'live-board' })),
  ...SELF_KNOWLEDGE.map((r) => ({ ...r, cat: 'self-knowledge' })),
  ...KNOWLEDGE.map((r) => ({ ...r, cat: 'knowledge' })),
  ...ACTIONS.map((r) => ({ ...r, cat: 'action' })),
];

/** All phrasings for a row across every pass (pass 1 `qs` + pass 2 `qs2`). */
export function allPhrasings(row) {
  return [...(row.qs ?? []), ...(row.qs2 ?? [])];
}

/** Phrasings for a specific pass (1-indexed). Pass 1 → `qs`, pass 2 → `qs2`. */
export function phrasingsForPass(row, pass) {
  return (pass === 1 ? row.qs : row.qs2) ?? [];
}

// Flatten to individual (question, expected-lane) probes, tagged by pass.
export const ALL_PROBES = QUESTION_MATRIX.flatMap((r) => [
  ...(r.qs ?? []).map((q) => ({ q, pass: 1, lane: r.lane ?? r.kind, id: r.id, cat: r.cat, needsData: r.needsData ?? null })),
  ...(r.qs2 ?? []).map((q) => ({ q, pass: 2, lane: r.lane ?? r.kind, id: r.id, cat: r.cat, needsData: r.needsData ?? null })),
]);
