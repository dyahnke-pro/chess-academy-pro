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
 * MULTI-PASS STRUCTURE (David's spec — each pass is all capabilities ≥3 ways,
 * harder each pass):
 *   `qs`  — PASS 1: ≥3 natural phrasings of the capability.
 *   `qs2` — PASS 2: ≥3 HARDER phrasings — oblique wording, indirect asks.
 *   `qs3` — PASS 3: ≥3 NASTIEST phrasings — British spellings, abbreviations,
 *           terse/casual register, diacritics, partial names (per CLAUDE.md G7:
 *           the messy-human failure-mode tier).
 * Add a `qsN` key + its index to PASS_KEYS to grow the loop another pass.
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
    qs3: ['plus or minus for me?', 'am I busted here?', 'how do I stand?'],
  },
  {
    id: 'best-move', lane: 'assembleMoveEvalAnswer', needsData: 'fen+engineBestMove',
    qs: ["what's my best move?", 'what should I play here?', 'best move?'],
    qs2: ['what would the engine play here?', 'give me the strongest continuation', 'what move should I make now?', 'top move in this spot?'],
    qs3: ["what's best?", 'what do I do here?', 'what should I play?'],
  },
  {
    id: 'plan', lane: 'assemblePlanAnswer', needsData: 'fen+enginePV',
    qs: ["what's my plan here?", "what's the idea in this position?", 'what should my plan be?'],
    qs2: ['what am I trying to do here?', 'how should I proceed from this position?', 'where do my pieces belong?', "what's the long-term idea?"],
    qs3: ["what's my plan?", 'what am I aiming for?', 'how do I set up here?'],
  },
  {
    id: 'tactics-live', lane: 'assembleTacticsAnswer', needsData: 'fen+tactics',
    qs: ['are there any tactics here?', 'is anything hanging?', 'is there a fork?', 'am I safe here?'],
    qs2: ['any combinations in this position?', 'is there a tactic I can play?', 'did I leave anything en prise?', 'is my king safe here?'],
    qs3: ['anything hanging?', 'any shots here?', 'is my king safe?'],
  },
  {
    id: 'master-play', lane: 'assembleMasterPlayAnswer', needsData: 'fen+masterPlay',
    qs: ['what do masters play here?', 'what does theory say here?', 'what is the main line from here?'],
    qs2: ['what do the grandmasters do in this position?', "what's book here?", 'how is this position handled at the top level?'],
    qs3: ["what's theory here?", "what's the main line?", 'what do GMs play here?'],
  },
  {
    id: 'player-games', lane: 'assemblePlayerGamesAnswer', needsData: 'fen+playerGames',
    qs: ['how does he play this line?', 'show me his games here', 'what did he play here?'],
    qs2: ['what does the pro do in this exact position?', 'pull up his games from this spot', 'how did he handle this line in his own games?'],
    qs3: ['show me his games', 'how does he play it?', 'has he played this?'],
  },
  {
    id: 'endgame-tablebase', lane: 'assembleEndgameAnswer', needsData: 'endgame-fen+tablebase',
    qs: ['how do I win this endgame?', 'is this endgame winning?', 'can I hold this ending?'],
    qs2: ['is this endgame a draw or a win?', "what's the technique to convert here?", 'how do I not lose this ending?'],
    qs3: ['can I hold this?', 'is this a draw?', 'how do I win this ending?'],
  },
  {
    id: 'move-rating', lane: 'assembleMoveRatingAnswer', needsData: 'lastMove+eval',
    qs: ['was that a good move?', 'rate my last move', 'how was that move?'],
    qs2: ['did I just blunder?', 'was my last move a mistake?', 'how bad was that move I played?'],
    qs3: ['was that ok?', 'did I mess up?', 'rate that move'],
  },
];

// ── B. SELF-KNOWLEDGE Q&A (need the student's game/puzzle history in Dexie) ───
export const SELF_KNOWLEDGE = [
  {
    id: 'weakness', lane: 'assembleWeaknessRecommendation', needsData: 'badHabits',
    qs: ['what are my weaknesses?', 'what should I work on?', 'where do I go wrong?'],
    qs2: ["what's the weakest part of my game?", 'what do I need to fix?', 'where am I leaking points?'],
    qs3: ['my weak spots?', 'what to work on?', 'where am I weakest?'],
  },
  {
    id: 'progress', lane: 'assembleProgressAnswer', needsData: 'badHabits',
    qs: ['am I improving?', 'how am I doing?', 'what are my bad habits?'],
    qs2: ['am I actually getting any better?', 'how has my play been lately?', 'what bad patterns keep showing up?'],
    qs3: ['am I improving?', 'my bad habits?', 'am I getting better?'],
  },
  {
    id: 'trend', lane: 'assembleTrendAnswer', needsData: 'games',
    qs: ["what's my rating trend?", 'am I getting better over time?', 'how has my rating moved?'],
    qs2: ['is my rating going up or down?', 'how has my rating changed recently?', 'am I trending up?'],
    qs3: ['is my rating climbing?', 'am I trending up?', 'is my rating improving?'],
  },
  {
    id: 'stats', lane: 'assembleStatsAnswer', needsData: 'games+profile',
    qs: ["what's my rating?", 'how many games have I played?', "what's my win rate?"],
    qs2: ['how many wins do I have?', 'what am I rated?', 'how often do I win?'],
    qs3: ['my rating?', 'my win rate?', 'how many games have I won?'],
  },
  {
    id: 'strengths', lane: 'assembleStrengthsAnswer', needsData: 'openingProfile',
    qs: ['what am I good at?', 'what are my strengths?', "what's the strongest part of my game?"],
    qs2: ['where do I play well?', 'what do I do best over the board?', 'what are my best skills?'],
    qs3: ['what am I good at?', 'my strengths?', 'where do I excel?'],
  },
  {
    id: 'opening-profile', lane: 'assembleOpeningProfileAnswer', needsData: 'openingProfile',
    qs: ["what's my best opening?", 'my strongest opening', "what's my weakest opening?"],
    qs2: ['which opening do I score best with?', 'what opening should I stop playing?', 'which of my openings is letting me down?'],
    qs3: ['my best opening?', 'my go-to opening?', 'my weakest opening?'],
  },
  {
    id: 'opening-accuracy', lane: 'assembleOpeningAccuracyAnswer', needsData: 'openingProfile',
    qs: ['how accurate am I in the Caro-Kann?', 'how well do I play the Italian?', 'how good is my Sicilian?'],
    qs2: ['how clean is my Caro-Kann play?', 'do I play the French accurately?', "what's my accuracy in the London?"],
    qs3: ['how well do I know the Caro?', 'how accurate am I in the Sicilian?', 'how deep is my Italian?'],
  },
  {
    id: 'opening-traps', lane: 'assembleOpeningTrapsAnswer', needsData: 'repertoire',
    qs: ['what traps can I play in the Italian?', 'what traps should I watch for in the Caro?', 'any traps in the Vienna?'],
    qs2: ['what tricks are there in the Italian?', 'how do I get tricked in the Caro-Kann?', 'what should I set up as a trap in the French?'],
    qs3: ['traps in the Italian?', 'what to watch for in the Caro?', 'any tricks in the Vienna?'],
  },
  {
    id: 'opening-record', lane: 'assembleOpeningRecordAnswer', needsData: 'games',
    qs: ['how do I do against the Sicilian?', "what's my record in the French?", 'how do I score in the Caro?'],
    qs2: ['do I struggle against the Sicilian?', 'am I any good in the French?', 'how have I done playing the London?'],
    qs3: ['my record against the Sicilian?', 'how do I do in the French?', 'my results in the Caro?'],
  },
  {
    id: 'opponent-record', lane: 'assembleOpponentRecordAnswer', needsData: 'games',
    qs: ['my record against Magnus', 'how do I do against iankane21?', 'my head to head with hikaru'],
    qs2: ['have I ever beaten iankane21?', 'how many times have I lost to Magnus?', "what's my score versus that guy?"],
    qs3: ['my record vs Magnus', 'have I beaten hikaru?', 'how do I do against iankane21?'],
  },
  {
    id: 'review-due', lane: 'assembleReviewDueAnswer', needsData: 'flashcards',
    qs: ["what's due for review?", 'any reviews?', 'do I have cards to review?'],
    qs2: ['is there anything to study today?', 'how many flashcards are waiting?', 'do I need to do my reviews?'],
    qs3: ["what's due?", 'any cards to review?', 'are any reviews due?'],
  },
  {
    id: 'mistakes', lane: 'assembleMistakesAnswer', needsData: 'mistakePuzzles',
    qs: ['what mistakes do I make?', 'how often do I blunder?', "what's my blunder rate?"],
    qs2: ['what kind of errors do I keep making?', 'do I blunder a lot?', 'what are my most common mistakes?'],
    qs3: ['do I blunder much?', 'my common errors?', 'what do I get wrong?'],
  },
  {
    id: 'tactics-profile', lane: 'assembleTacticsProfileAnswer', needsData: 'themeSkills',
    qs: ['how are my tactics?', "what's my weakest tactic?", 'what tactics do I miss?'],
    qs2: ['which tactical motif do I struggle with?', 'am I good at tactics?', 'what tactics should I drill?'],
    qs3: ['my weakest tactic?', 'am I good at tactics?', 'what tactics do I miss?'],
  },
  {
    id: 'phase-profile', lane: 'assemblePhaseProfileAnswer', needsData: 'games',
    qs: ['which phase am I weakest in?', 'where do I lose games?', 'how is my endgame play?'],
    qs2: ['do I lose in the opening, middlegame, or endgame?', 'which stage of the game hurts me most?', 'is my middlegame the problem?'],
    qs3: ['which phase am I worst in?', "how's my endgame?", 'where do I lose?'],
  },
  {
    id: 'repertoire-gap', lane: 'assembleRepertoireGapAnswer', needsData: 'repertoire+games',
    qs: ['where are the gaps in my repertoire?', 'what should I add to my repertoire?', 'what am I missing in my openings?'],
    qs2: ['what lines do I need to learn?', 'where is my repertoire thin?', 'what openings should I prepare next?'],
    qs3: ['gaps in my repertoire?', 'what to learn next?', 'where am I unprepared?'],
  },
  {
    id: 'accuracy', lane: 'assembleAccuracyAnswer', needsData: 'games',
    qs: ["what's my accuracy?", 'how accurate am I overall?', 'what accuracy do I average?'],
    qs2: ['how precise is my play?', 'do I play accurately?', "what's my average accuracy across games?"],
    qs3: ['how accurate am I?', 'my accuracy?', 'how often do I find the best move?'],
  },
  {
    id: 'consistency', lane: 'assembleConsistencyAnswer', needsData: 'games',
    qs: ['how consistent am I?', 'am I streaky?', 'is my play steady?'],
    qs2: ['do I play the same level every game?', 'am I all over the place?', 'how reliable is my play?'],
    qs3: ['am I consistent?', 'am I streaky?', 'is my play steady?'],
  },
  {
    id: 'converting', lane: 'assembleConvertingAnswer', needsData: 'games',
    qs: ['how good am I at converting winning positions?', 'do I convert my advantages?', 'do I close out won games?'],
    qs2: ['do I throw away winning positions?', 'can I finish off a winning game?', 'do I let wins slip?'],
    qs3: ['do I convert?', 'do I close out wins?', 'do I blow winning positions?'],
  },
  {
    id: 'color', lane: 'assembleColorAnswer', needsData: 'games',
    qs: ['am I better as White or Black?', 'which color do I play better?', 'do I score more with White?'],
    qs2: ['is White or Black my stronger side?', 'do I struggle with the black pieces?', 'which side suits me?'],
    qs3: ['white or black?', 'am I better with White?', 'which colour am I better with?'],
  },
  {
    id: 'records', lane: 'assembleRecordsAnswer', needsData: 'games',
    qs: ["what's my best win?", 'my records', 'my longest win streak'],
    qs2: ['who is the highest-rated player I have beaten?', 'what was my biggest upset?', 'how long is my best streak?'],
    qs3: ['my best win?', 'my records', 'my biggest scalp?'],
  },
  {
    id: 'record-vs-target', lane: 'recordVsTarget', needsData: 'games',
    qs: ['how do I score against the Sicilian?', 'my results versus the French', 'how do I do against d4?'],
    qs2: ['am I winning against 1.e4?', 'how do I fare facing the Sicilian?', "what's my score with d4 openings?"],
    qs3: ['my record against the French', 'how do I score vs 1.e4?', 'my results facing the Sicilian'],
  },
  {
    id: 'puzzle-stats', lane: 'assemblePuzzleStatsAnswer', needsData: 'puzzles',
    qs: ["what's my puzzle rating?", 'how many puzzles have I solved?', "what's my tactics rating?"],
    qs2: ['how good is my puzzle rush?', 'how many tactics have I done?', "what's my puzzle score?"],
    qs3: ['my puzzle rating?', 'how many puzzles have I solved?', 'my tactics rating?'],
  },
  {
    id: 'transfer-gap', lane: 'assembleTransferGapAnswer', needsData: 'puzzles+games',
    qs: ['do my tactics transfer to games?', "why don't my puzzles help my games?", 'do puzzles improve my games?'],
    qs2: ['why am I good at puzzles but bad in games?', 'does my puzzle skill show up over the board?', "why don't my tactics carry into real games?"],
    qs3: ['am I better at puzzles than games?', 'why do I miss in games what I solve in puzzles?', 'do I spot tactics in games as well as puzzles?'],
  },
  {
    id: 'skill-radar', lane: 'assembleSkillRadarAnswer', needsData: 'skillRadar',
    qs: ['show my skill radar', 'break down my skills', 'what does my skill profile look like?'],
    qs2: ['give me the full breakdown of my abilities', 'map out all my skills', 'where do all my skills sit?'],
    qs3: ['show my skill radar', 'break down my skills', 'rate my chess'],
  },
  // DATA-CAPTURE (2026-07-10) — previously safe-defaulted; now real assemblers.
  {
    id: 'time-trouble', lane: 'assembleTimeTroubleAnswer', needsData: 'games+clock+mistakes',
    qs: ['do I play too fast?', 'am I flagging a lot?', 'do I lose on time?'],
    qs2: ['do I blunder in time trouble?', "how's my clock management?", 'do I crumble under time pressure?'],
    qs3: ['do I rush?', 'do I manage my time?', 'do I panic on a low clock?'],
  },
  {
    id: 'last-game', lane: 'assembleLastGameAnswer', needsData: 'games',
    qs: ['did I win my last game?', 'what was the result of my last game?', 'how did my last game go?'],
    qs2: ['did I lose my latest game?', 'how did I do in my most recent game?', 'won or lost my last game?'],
    qs3: ['did I win my last game?', 'result of my previous game?', 'how did my last game go?'],
  },
];

// ── C. KNOWLEDGE / PEDAGOGY Q&A (no student data needed) ──────────────────────
export const KNOWLEDGE = [
  {
    id: 'concept', lane: 'assembleConceptAnswer', needsData: null,
    qs: ["what's a fork?", 'explain the back-rank mate', 'what is a zwischenzug?', 'what is an outpost?'],
    qs2: ['what does en prise mean?', 'explain a discovered attack', 'what is a skewer?', 'what does zugzwang mean?'],
    qs3: ["what's a pin?", 'explain a battery', 'what is a passed pawn?'],
  },
  {
    id: 'teaching-method', lane: 'assembleTeachingAnswer', needsData: null,
    qs: ['how do you teach the Caro-Kann?', 'how do you teach the Vienna?', 'how does this app teach the Italian?'],
    qs2: ['walk me through how you teach the French', "what's your method for teaching the London?", 'how would you break down teaching the Sicilian?'],
    qs3: ['how do you teach the Caro?', 'how you teach the Vienna', 'your approach to teaching the Italian?'],
  },
  {
    id: 'settings-query', lane: 'assembleSettingsAnswer', needsData: null,
    qs: ['is voice on?', "what's my narration level?", 'what are my settings?', 'is my voice narration on?'],
    qs2: ['do I have the voice turned on?', 'how verbose is my narration set?', 'what theme am I using?'],
    qs3: ['is voice on?', "what's my narration level?", 'my settings?'],
  },
  {
    id: 'app-help', lane: 'assembleAppHelpAnswer', needsData: null,
    qs: ['what does the Tactics tab do?', 'how does the Calculation trainer work?', "what's the Weaknesses tab for?"],
    qs2: ['what is the openings section for?', 'how do I use the review tab?', 'what can I do on the play page?'],
    qs3: ['what does the tactics tab do?', 'how does the calculation trainer work?', "what's the weaknesses tab for?"],
  },
];

// ── D. ACTIONS the coach is expected to TAKE (routeChatIntent → nav/settings/session) ──
export const ACTIONS = [
  {
    id: 'navigate', kind: 'navigate',
    qs: ['take me to tactics', 'open settings', 'go to my weaknesses', 'show me the openings', 'take me to the review page', 'open the tactics trainer'],
    qs2: ['bring up the settings page', 'jump to my game database', 'navigate to the calculation trainer', 'switch to the openings explorer', 'go home', 'pull up my mistakes'],
    qs3: ['open settings', 'take me to tactics', 'show me the openings'],
  },
  {
    id: 'set-voice', kind: 'settings-mutation',
    qs: ['turn on voice narration', 'turn off voice', 'mute the coach'],
    qs2: ['enable the voice', 'stop talking to me', 'silence the coach'],
    qs3: ['turn on voice', 'turn off the voice', 'mute it'],
  },
  {
    id: 'set-verbosity', kind: 'settings-mutation',
    qs: ['set narration to brief', 'set verbosity to full', 'make the coach silent'],
    qs2: ['keep the narration short', 'give me detailed narration', 'switch narration to concise'],
    qs3: ['set verbosity to full', 'set narration to brief', 'make the narration detailed'],
  },
  {
    id: 'set-hints', kind: 'settings-mutation',
    qs: ['enable hints', 'turn off hints', 'show me hints'],
    qs2: ['I want hints on', 'disable the hints', 'stop showing hints'],
    qs3: ['turn on hints', 'disable hints', 'enable hints'],
  },
  {
    id: 'set-premium-voice', kind: 'settings-mutation',
    qs: ['turn on premium voice', 'use the natural voice', 'enable the polly voice'],
    qs2: ['switch to the better voice', 'turn off the premium voice', 'use the device voice instead'],
    qs3: ['turn on premium voice', 'use the natural voice', 'switch to polly'],
  },
  {
    id: 'set-theme', kind: 'settings-mutation',
    qs: ['switch to dark theme', 'switch to light mode', 'use the midnight theme'],
    qs2: ['go dark', 'make it light', 'put it in night mode'],
    qs3: ['switch to dark mode', 'use the light theme', 'go dark'],
  },
  {
    id: 'play-against', kind: 'session-start',
    qs: ['play the Caro-Kann against me', "let's play the Sicilian", 'play a game with me in the Italian'],
    qs2: ['spar with me in the French', 'can we play out the London?', 'play against me in the Vienna'],
    qs3: ["let's play the Caro", 'play the Sicilian against me', 'start a game in the Italian'],
  },
  {
    id: 'teach-opening', kind: 'teach',
    qs: ['teach me the Vienna', 'walk me through the Najdorf', 'teach me the London'],
    qs2: ['show me how the Caro-Kann works', 'I want to learn the French', 'go through the Italian with me'],
    qs3: ['teach me the Vienna', 'walk me through the French', 'study the London'],
  },
  {
    // parseCoachIntent → 'review-game' (needs a recency marker: last/latest/
    // most-recent/previous). routeChatIntent returns a /coach/review route.
    id: 'review-game', kind: 'review-game',
    qs: ['review my last game', 'go over my last game', 'walk me through my most recent game'],
    qs2: ['recap my latest game', 'run me through my previous game', 'narrate my last game'],
    qs3: ['review my last game', 'go over my most recent game', 'recap my latest game'],
  },
  {
    // parseCoachIntent → 'explain-position' (needs currentFen). This is the
    // ACTION that reaches assembleGameReviewAnswer / position-assessment on the
    // explain surface.
    id: 'explain-position', kind: 'explain-position',
    qs: ['explain this position', 'break down this position', "what's going on here"],
    qs2: ['analyze this position', 'evaluate this', "what's happening here"],
    qs3: ['explain this position', 'analyse this position', 'break down this position'],
  },
  {
    // parseCoachIntent → 'continue-middlegame' (routes to a plan; carry a
    // subject so the deterministic resolver finds a DB plan, not a null).
    id: 'continue-middlegame', kind: 'continue-middlegame',
    qs: ['continue the middlegame in the Italian', 'show me the middlegame plan for the Caro-Kann', 'run me through the middlegame of the French'],
    qs2: ['walk me through the Sicilian middlegame', 'teach the middlegame plan in the Vienna', 'continue the London middlegame'],
    qs3: ['continue the middlegame in the Caro-Kann', 'show me the Italian middlegame plan', 'run me through the French middlegame'],
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
    qs3: ['drill the Italian', 'quiz me on the French', 'trap in the Caro-Kann'],
  },
  {
    // favorite_opening TOOL exists; the deterministic router has no case yet.
    id: 'favorite-opening', kind: 'favorite-opening', knownGap: 'task-19',
    qs: ['favorite the Caro-Kann', 'star the Vienna', 'add the Italian to my favorites'],
    qs2: ['bookmark the French', 'favourite the London', 'add the Sicilian to my favourites'],
    qs3: ['favorite the Caro', 'star the Vienna', 'bookmark the Italian'],
  },
  {
    // save_opening_to_repertoire / set_intended_opening TOOLs exist; no
    // deterministic router case.
    id: 'manage-repertoire', kind: 'repertoire', knownGap: 'task-19',
    qs: ['add the Vienna to my repertoire', 'save the Caro-Kann to my repertoire', "I'm going to play the London"],
    qs2: ['put the Italian in my repertoire', 'set my opening to the French', 'lock in the Sicilian as my opening'],
    qs3: ['add the Vienna to my repertoire', 'save the Caro to my repertoire', 'set my opening to the French'],
  },
  {
    // take_back_move / reset_board / save_position / restore_saved_position
    // TOOLs exist; no deterministic router case.
    id: 'board-control', kind: 'board', knownGap: 'task-19',
    qs: ['take that back', 'undo my move', 'reset the board'],
    qs2: ['let me take that move back', 'start the position over', 'clear the board'],
    qs3: ['take that back', 'undo my move', 'reset the board'],
  },
  {
    id: 'training-aid', kind: 'training',
    qs: ['give me a fork puzzle', 'drill my weaknesses', 'let me practice endgames'],
    qs2: ['I want a pin puzzle', 'work on my weak spots', 'practice some rook endings'],
    qs3: ['give me a fork puzzle', 'drill my weaknesses', 'practice endgames'],
  },
];

// The full matrix, flattened, with a category tag.
export const QUESTION_MATRIX = [
  ...LIVE_BOARD.map((r) => ({ ...r, cat: 'live-board' })),
  ...SELF_KNOWLEDGE.map((r) => ({ ...r, cat: 'self-knowledge' })),
  ...KNOWLEDGE.map((r) => ({ ...r, cat: 'knowledge' })),
  ...ACTIONS.map((r) => ({ ...r, cat: 'action' })),
];

/** The pass keys in order — `qs` (1), `qs2` (2), `qs3` (3), … Add a key here
 *  when you add a harder pass; the audit + helpers pick it up automatically. */
export const PASS_KEYS = ['qs', 'qs2', 'qs3'];

// ── PASS 4 — filler robustness (generated) ───────────────────────────────────
// Rather than hand-author a 4th phrasing per family, pass 4 WRAPS each family's
// pass-1 phrasings in the conversational filler real users pad questions with
// (leading greetings/hedges + mid/trailing filler). The runtime normalizes this
// away (`stripQuestionFiller` in questionIntents), so every family must still
// route through the padding. Tests all 52 families generically.
const FILLER_WRAPS = [
  (q) => `hey so um ${q}`,
  (q) => `honestly ${q.replace(/\?+$/, '')} at all`,
  (q) => `ok real quick ${q}`,
];
/** Filler-wrapped pass-4 variants of a row's pass-1 phrasings. */
export function fillerVariants(row) {
  return (row.qs ?? []).flatMap((q) => FILLER_WRAPS.map((w) => w(q)));
}

// The specific HARDER-STRUCTURE phrasings pass 4 surfaced (distinct wordings the
// filler wrap alone wouldn't cover) — kept explicit so the widenings that fixed
// them stay regression-locked. Each must route to its family's lane/kind.
export const STRUCTURAL_PROBES = [
  { id: 'best-move', cat: 'live-board', q: 'what should I be playing here' },
  { id: 'plan', cat: 'live-board', q: 'what am I even doing in this position' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'which opening is basically my bread and butter' },
  { id: 'mistakes', cat: 'self-knowledge', q: 'what dumb mistakes do I keep repeating' },
  { id: 'accuracy', cat: 'self-knowledge', q: 'roughly how accurate is my play these days' },
  { id: 'color', cat: 'self-knowledge', q: 'am I honestly just better with the white pieces' },
  { id: 'converting', cat: 'self-knowledge', q: 'do I tend to throw away winning positions' },
  { id: 'navigate', cat: 'action', q: 'hey can you take me over to the tactics trainer' },
  // Pass 5 — ultra-terse tier (the verb/filler-stripped bones of a question).
  { id: 'position-assessment', cat: 'live-board', q: 'so, winning or losing?' },
  { id: 'best-move', cat: 'live-board', q: 'best here?' },
  { id: 'stats', cat: 'self-knowledge', q: 'rating?' },
  { id: 'trend', cat: 'self-knowledge', q: 'trending up or down' },
  { id: 'tactics-profile', cat: 'self-knowledge', q: 'worst tactical motif for me' },
  { id: 'review-due', cat: 'self-knowledge', q: 'anything to review' },
  { id: 'set-hints', cat: 'action', q: 'hints on' },
  { id: 'set-verbosity', cat: 'action', q: 'narration to full' },
  { id: 'teach-opening', cat: 'action', q: 'teach the caro' },
  // Pass 6 — common typos (normalized by the COMMON_TYPOS map).
  { id: 'progress', cat: 'self-knowledge', q: 'am i improvng at all' },
  { id: 'stats', cat: 'self-knowledge', q: 'whats my ratng' },
  { id: 'mistakes', cat: 'self-knowledge', q: 'what mistaks do i make' },
  { id: 'tactics-profile', cat: 'self-knowledge', q: 'whats my weakest tactc' },
  { id: 'accuracy', cat: 'self-knowledge', q: 'how accurate am i overal' },
  { id: 'position-assessment', cat: 'live-board', q: 'whos winnin here' },
  // Pass 7 — genuinely NEW question shapes (comparatives, temporal, hypothetical,
  // threat/mate, meta) + the position-vs-skill misroute guard.
  { id: 'tactics-live', cat: 'live-board', q: 'what is my opponent threatening right now' },
  { id: 'tactics-live', cat: 'live-board', q: 'am i about to get mated' },
  { id: 'progress', cat: 'self-knowledge', q: 'what is the fastest way for me to improve' },
  { id: 'best-move', cat: 'live-board', q: 'what happens if i play e5 here' },
  { id: 'stats', cat: 'self-knowledge', q: 'how have i done this week' },
  { id: 'stats', cat: 'self-knowledge', q: 'how are my last 10 games' },
  { id: 'skill-radar', cat: 'self-knowledge', q: 'what do you actually know about my chess' },
  { id: 'skill-radar', cat: 'self-knowledge', q: 'am i better at tactics or endgames' },
  { id: 'master-play', cat: 'live-board', q: 'what the top players play in this position' },
  // Pass 8 — decisions / piece-pawn / study-planning / opponent-prep, and the
  // MISROUTE GUARDS (`notKey` = an intent that must NOT fire, or the ask would
  // get the wrong answer). `notKey` on a Q&A probe asserts that flag is absent.
  { id: 'position-assessment', cat: 'live-board', q: 'should i resign' },
  { id: 'position-assessment', cat: 'live-board', q: 'is it worth playing on' },
  { id: 'position-assessment', cat: 'live-board', q: 'is my bishop bad' },
  { id: 'position-assessment', cat: 'live-board', q: 'do i have weak pawns' },
  { id: 'best-move', cat: 'live-board', q: 'which piece should i develop' },
  { id: 'tactics-live', cat: 'live-board', q: 'should i be worried about my king' },
  { id: 'repertoire-gap', cat: 'self-knowledge', q: 'how do i prepare for a 1.e4 player' },
  { id: 'progress', cat: 'self-knowledge', q: 'what should i drill' },
  { id: 'concept', cat: 'knowledge', q: 'how do pins work' },
  // misroute guards — the "must NOT fire the board intent" cases
  { id: 'progress', cat: 'self-knowledge', q: 'make me a training plan', notKey: 'planQuestion' },
  { id: 'progress', cat: 'self-knowledge', q: 'plan my training', notKey: 'planQuestion' },
  { id: 'concept', cat: 'knowledge', q: 'teach me forks', notKey: 'tacticsQuestion' },
  { id: 'tactics-profile', cat: 'self-knowledge', q: 'am i better at tactics or endgames', notKey: 'positionAssessmentQuestion' },
  // Pass 9 — probability / square-file / pro-game / exact-numeric / app-usage,
  // and 3 more misroute guards.
  { id: 'position-assessment', cat: 'live-board', q: 'what are my chances here' },
  { id: 'position-assessment', cat: 'live-board', q: 'will i win this' },
  { id: 'position-assessment', cat: 'live-board', q: 'is e4 weak' },
  { id: 'player-games', cat: 'live-board', q: 'show me a hikaru game in this line' },
  { id: 'stats', cat: 'self-knowledge', q: 'whats my exact rating' },
  { id: 'trend', cat: 'self-knowledge', q: 'how many rating points did i gain' },
  { id: 'app-help', cat: 'knowledge', q: 'how should i use this app to improve' },
  { id: 'app-help', cat: 'knowledge', q: 'whats the best way to use this app', notKey: 'bestMoveQuestion' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'whats my best opening', notKey: 'bestMoveQuestion' },
  { id: 'trend', cat: 'self-knowledge', q: 'am i better than i was last month', notKey: 'positionAssessmentQuestion' },
  // Pass 10 — list/quantity, rating-goal, double-negation, recent-form.
  { id: 'weakness', cat: 'self-knowledge', q: 'list my top 3 weaknesses' },
  { id: 'progress', cat: 'self-knowledge', q: 'give me three things to work on' },
  { id: 'progress', cat: 'self-knowledge', q: 'what are the top 5 things holding me back' },
  { id: 'progress', cat: 'self-knowledge', q: 'how do i get to 2000' },
  { id: 'progress', cat: 'self-knowledge', q: 'what will get me to 1800' },
  { id: 'strengths', cat: 'self-knowledge', q: 'what am i not weak at' },
  { id: 'consistency', cat: 'self-knowledge', q: 'whats my recent form' },
  // Pass 11 — statement-form / coaching-meta / time-control, + endgame misroute.
  { id: 'phase-profile', cat: 'self-knowledge', q: 'i always lose the endgame', notKey: 'endgameQuestion' },
  { id: 'mistakes', cat: 'self-knowledge', q: 'i blunder too much' },
  { id: 'progress', cat: 'self-knowledge', q: 'what should we work on today' },
  { id: 'progress', cat: 'self-knowledge', q: 'give me some homework' },
  { id: 'tactics-live', cat: 'live-board', q: 'can i attack his king' },
  { id: 'consistency', cat: 'self-knowledge', q: 'how do i do in rapid', notKey: 'recordVsTarget' },
  { id: 'time-trouble', cat: 'self-knowledge', q: 'am i good with the clock', notKey: 'recordVsTarget' },
  { id: 'last-game', cat: 'self-knowledge', q: 'did i lose the last one' },
  // Pass 12 — coordination / practical decisions / rating-band, + 2 misroutes.
  { id: 'position-assessment', cat: 'live-board', q: 'are my bishops any good' },
  { id: 'position-assessment', cat: 'live-board', q: 'should i offer a draw' },
  { id: 'position-assessment', cat: 'live-board', q: 'is my structure sound' },
  { id: 'plan', cat: 'live-board', q: 'where does my knight belong' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'is this a good opening for me', notKey: 'moveRatingQuestion' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'should i keep playing the caro' },
  { id: 'move-rating', cat: 'live-board', q: 'why did i play that', notKey: 'playerGamesQuestion' },
  { id: 'move-rating', cat: 'live-board', q: 'was e4 the right call' },
  { id: 'master-play', cat: 'live-board', q: 'how do 1500s play this' },
  { id: 'tactics-live', cat: 'live-board', q: 'is this a perpetual' },
  // Pass 13 — soundness / coach-meta / repertoire-vs / compensation / goal-time.
  { id: 'master-play', cat: 'live-board', q: 'is the najdorf sound' },
  { id: 'master-play', cat: 'live-board', q: 'is this line any good' },
  { id: 'app-help', cat: 'knowledge', q: 'what can you do' },
  { id: 'repertoire-gap', cat: 'self-knowledge', q: 'what do i play against the caro as white' },
  { id: 'position-assessment', cat: 'live-board', q: 'do i have enough for the sacrifice' },
  { id: 'progress', cat: 'self-knowledge', q: 'how long to reach 2000' },
  // Pass 14 — prophylaxis / piece-square / material / simplify / comparison.
  { id: 'plan', cat: 'live-board', q: "what's my opponent's plan" },
  { id: 'position-assessment', cat: 'live-board', q: 'is my knight on d5 good' },
  { id: 'best-move', cat: 'live-board', q: 'should i move my a-pawn' },
  { id: 'position-assessment', cat: 'live-board', q: 'how many pieces do i have' },
  { id: 'best-move', cat: 'live-board', q: 'should i simplify' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'is the caro better than the french for me' },
  { id: 'opening-accuracy', cat: 'self-knowledge', q: 'how much theory do i need' },
  { id: 'position-assessment', cat: 'live-board', q: 'evaluate my position' },
  { id: 'trend', cat: 'self-knowledge', q: 'was i better last year' },
  // Pass 15 — named sacs / attack-defend / playstyle / opponent-aggregate.
  { id: 'tactics-live', cat: 'live-board', q: 'is this a greek gift' },
  { id: 'plan', cat: 'live-board', q: 'should i attack or defend' },
  { id: 'plan', cat: 'live-board', q: 'kingside or queenside' },
  { id: 'plan', cat: 'live-board', q: 'where should i attack' },
  { id: 'converting', cat: 'self-knowledge', q: 'am i better attacking or defending', notKey: 'positionAssessmentQuestion' },
  { id: 'converting', cat: 'self-knowledge', q: 'am i an attacker or a defender' },
  { id: 'records', cat: 'self-knowledge', q: 'who beats me' },
  // Pass 16 — outpost/best-square / today / draw-rate / doing-well / predictable.
  { id: 'plan', cat: 'live-board', q: 'best outpost for my knight' },
  { id: 'position-assessment', cat: 'live-board', q: 'is d5 a good square for me' },
  { id: 'stats', cat: 'self-knowledge', q: 'how many games today' },
  { id: 'stats', cat: 'self-knowledge', q: "what's my draw rate" },
  { id: 'progress', cat: 'self-knowledge', q: 'am i doing well' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'am i predictable' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'what opening is dragging me down' },
  // Pass 17 — habit-vs-live tactic guards + trades / comparison / summary.
  { id: 'tactics-profile', cat: 'self-knowledge', q: 'do i miss forks', notKey: 'tacticsQuestion' },
  { id: 'mistakes', cat: 'self-knowledge', q: 'do i hang my queen', notKey: 'tacticsQuestion' },
  { id: 'mistakes', cat: 'self-knowledge', q: 'do i drop my pawns' },
  { id: 'best-move', cat: 'live-board', q: 'is trading queens good here' },
  { id: 'opening-profile', cat: 'self-knowledge', q: 'is e4 or d4 better for me' },
  { id: 'skill-radar', cat: 'self-knowledge', q: 'summarize my chess' },
  { id: 'skill-radar', cat: 'self-knowledge', q: 'give me a report card' },
  { id: 'repertoire-gap', cat: 'self-knowledge', q: 'whats next after the italian' },
];

/** All phrasings for a row across EVERY pass. */
export function allPhrasings(row) {
  return PASS_KEYS.flatMap((k) => row[k] ?? []);
}

/** Phrasings for a specific pass (1-indexed). */
export function phrasingsForPass(row, pass) {
  return row[PASS_KEYS[pass - 1]] ?? [];
}

// Flatten to individual (question, expected-lane) probes, tagged by pass.
export const ALL_PROBES = QUESTION_MATRIX.flatMap((r) =>
  PASS_KEYS.flatMap((k, i) =>
    (r[k] ?? []).map((q) => ({ q, pass: i + 1, lane: r.lane ?? r.kind, id: r.id, cat: r.cat, needsData: r.needsData ?? null })),
  ),
);
