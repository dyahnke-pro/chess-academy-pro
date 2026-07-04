/**
 * questionIntents — the PURE, leaf-level question detectors + the shared
 * grounding builder. Extracted from coachService so LIGHT surfaces (voice,
 * the masterclass course chat) can import `buildQuestionGrounding` without
 * pulling the heavy coach spine (envelope / providers / db). No side effects,
 * no heavy imports — just regex intent detection + a plain-object builder.
 * coachService re-exports everything here for back-compat.
 */

/** Map the spine's `CoachSurface` enum to a route path the audit
 *  stream + claim-validator audits can attribute against. Used by
 *  the auto-grounding hook to label which surface generated each
 *  master-play event. WO-COACH-MASTER-INTEGRATION. */
export function coachSurfaceToRoute(surface: string): string {
  switch (surface) {
    case 'home-chat':       return '/coach/home';
    case 'standalone-chat': return '/coach/chat';
    case 'game-chat':       return '/coach/play';
    case 'move-selector':   return '/coach/play';
    case 'hint':            return '/coach/play';
    case 'phase-narration': return '/coach/play';
    case 'ping':            return '/coach/play';
    case 'review':          return '/coach/review';
    case 'teach':           return '/coach/teach';
    case 'smart-search':    return '/';
    default:                return `/coach/${surface}`;
  }
}

// this problem for ALL questions"). Each grounded-answer router below is built
// from an explicit LIST of phrasings instead of one dense regex, so a student
// gets routed to the right computed-fact answer no matter HOW they word it —
// "what are my weaknesses?" and "what's the weakest aspect of my game?" must
// land in the same place. To widen a router, add a phrasing to its array.
// Disambiguations between routers (e.g. position-assessment must NOT swallow
// progress/best-move) are preserved and covered by coachService.questionIntents.test.ts.
//
// `anyOf` joins alternatives into one case-insensitive regex; `\b` word
// boundaries are baked into each fragment as needed.
const anyOf = (alts: string[]): RegExp => new RegExp(alts.join('|'), 'i');

const PLAN_QUESTION_RE = anyOf([
  String.raw`\bplans?\b`,
  String.raw`\bstrateg(?:y|ies|ize|ic)\b`,
  String.raw`\bnext\s+(?:few|couple|two|three|several|2|3|\d+)\s+moves?\b`,
  String.raw`\bmain\s+ideas?\b`,
  String.raw`\bmy\s+ideas?\b`,
  String.raw`\bidea\s+here\b`,
  String.raw`\blong[-\s]?term\b`,
  String.raw`\bgame\s*plan\b`,
  String.raw`\bhow\s+(?:do\s+i|should\s+i|to)\s+(?:proceed|continue|play|approach|handle|develop|set\s+up)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the|my)\s+(?:plan|idea|strategy|approach|goal|aim)\b`,
  String.raw`\bwhat(?:'?s| is| am)?\s+i\s+(?:trying|aiming|looking)\s+to\s+(?:do|achieve)\b`,
  String.raw`\boutline\s+(?:a|my|the)?\s*(?:plan|strategy)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:goal|objective|aim)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:my|the)\s+(?:setup|structure|formation|pawn\s+structure)\b`,
  String.raw`\bwhere\s+(?:do|should)\s+(?:my\s+)?(?:pieces?|knights?|bishops?|rooks?|queen|king)\s+(?:go|belong|head)\b`,
  String.raw`\bhow\s+do\s+i\s+(?:make\s+progress|build\s+up|improve\s+my\s+position|attack|defend|press|convert\s+my\s+edge)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:right|correct|best)\s+(?:plan|setup|approach|way\s+to\s+play)\b`,
  String.raw`\bwhat\s+am\s+i\s+(?:supposed|meant)\s+to\s+do\b`,
  String.raw`\blong[-\s]?(?:range|haul)\b`,
]);
export function isPlanQuestion(ask: string | undefined): boolean {
  return !!ask && PLAN_QUESTION_RE.test(ask);
}

/** A BEST-MOVE / SOUNDNESS question — "what's the best move here?", "is
 *  this sound?", "does White only have one good move?". Answering it
 *  HONESTLY means naming the engine's best move AND the short line that
 *  shows why (the opponent's reply + the follow-up). Those forward SANs
 *  aren't legal in the current position, so the bare-SAN claim gate flagged
 *  them, exhausted the retry budget, and served the cold can't-verify
 *  fallback — on a position the coach was literally holding a Stockfish eval
 *  for (David 2026-06-09, "No bueno").
 *  Detecting it here exempts JUST the bare-SAN gate for the turn (the same
 *  carve-out plan/move-narration questions already get); every fabrication
 *  guard — percentages, game counts, ratings, player attributions, "most
 *  popular" comparatives — stays fully in force, so G3 is not weakened. */
const BEST_MOVE_QUESTION_RE = anyOf([
  String.raw`\b(?:best|strongest|top|optimal|ideal|right|correct|winning|killer|critical)\s+(?:move|continuation|option|choice|try|play|reply|response|idea)\b`,
  String.raw`\bbest\b[\s\S]{0,12}\bto\s+play\b`,
  String.raw`\bonly\s+(?:\w+\s+){0,3}(?:good\s+)?moves?\b`,
  String.raw`\bone\s+(?:good\s+)?move\b`,
  String.raw`\bwhat\s+should\s+(?:i|white|black|we)\s+play\b`,
  String.raw`\bwhat\s+(?:do|would|can|must|should)\s+(?:i|we|you)\s+play(?:\s+here)?\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+|white'?s?\s+|black'?s?\s+|my\s+)?best(?:\s+(?:move|here|option|play))?\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:right|correct|winning|strongest)\s+(?:move|continuation)\b`,
  String.raw`\bhow\s+should\s+(?:i|we)\s+(?:continue|respond|recapture)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+move\b`,
  String.raw`\bis\s+(?:this|that|it|[A-Za-z0-9+#=-]{1,6})\s+(?:the\s+)?(?:best|sound|good|winning|correct|playable|right|strong|a\s+(?:good|sound|strong)\s+move)\b`,
  String.raw`\bshould\s+i\s+(?:play|go\s+for|take|capture|push|trade|castle)\b`,
  String.raw`\bcandidate\s+moves?\b`,
  String.raw`\bwhat\s+(?:do|should)\s+i\s+do\s+(?:here|now|in\s+this)\b`,
  String.raw`\bis\s+there\s+(?:a\s+)?better\s+(?:move|option|continuation)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:engine|computer)('?s)?\s+(?:move|pick|choice|line)\b`,
  String.raw`\btop\s+(?:choice|pick|move)\b`,
  String.raw`\bwhat\s+now\b`,
]);
export function isBestMoveQuestion(ask: string | undefined): boolean {
  return !!ask && BEST_MOVE_QUESTION_RE.test(ask);
}

/** A TACTICS / DANGER question — "is anything hanging?", "what's the threat?",
 *  "is there a fork / pin / mate here?", "am I in danger?", "is my queen safe?".
 *  The answer is `liveTacticsContext`'s ALREADY-computed descriptions (forks,
 *  hanging pieces, mate-in-one, top threat/opportunity) — so the grounding
 *  inversion (Phase 2) routes it through `assembleTacticsAnswer` → voiceFacts
 *  and the LLM voices the engine's facts, deciding nothing. */
const TACTICS_QUESTION_RE = anyOf([
  String.raw`\bhang(?:ing|s)?\b`,
  String.raw`\ben\s*prise\b`,
  String.raw`\bloose\s+piece`,
  String.raw`\b(?:any\s+)?threats?\b`,
  String.raw`\b(?:a\s+)?forks?\b`,
  String.raw`\bpinn?(?:ed|ing)?\b`,
  String.raw`\bskewers?\b`,
  String.raw`\bdiscover(?:ed|y|ies)\b`,
  String.raw`\bdouble\s+attack\b`,
  String.raw`\bin\s+danger\b`,
  String.raw`\bunder\s+attack\b`,
  String.raw`\b(?:is\s+(?:it|there|my|the)\b[\s\S]{0,40}\b(?:safe|hanging|attacked|defended|loose|trapped))`,
  String.raw`\bam\s+i\s+safe\b`,
  String.raw`\bsafe\s+(?:here|now)\b`,
  String.raw`\bcan\s+(?:i|it|he|she|they|white|black)\s+be\s+(?:punished|taken|captured|trapped|exploited)\b`,
  String.raw`\b(?:is\s+there\s+(?:a\s+)?)?mate(?:\s+(?:here|in\s+\w+|threat))?\b`,
  String.raw`\btactics?\b`,
  String.raw`\bcombination\b`,
  String.raw`\b(?:any\s+)?(?:shot|sac(?:rifice)?|trick|tactic)\s+(?:here|available|on|in\s+this)?\b`,
  String.raw`\bcan\s+i\s+(?:win|grab|take|snag|pick\s+up)\s+(?:material|a\s+piece|a\s+pawn|the)\b`,
  String.raw`\bwin\s+(?:material|a\s+piece|a\s+pawn)\b`,
  String.raw`\bundefended\b`,
  String.raw`\boverload(?:ed|ing)?\b`,
  String.raw`\bback[-\s]?rank\b`,
  String.raw`\bcan\s+i\s+sac(?:rifice)?\b`,
  String.raw`\bis\s+(?:my\s+|the\s+|his\s+|her\s+)?\w+\s+(?:defended|protected|loose|hanging|trapped|en\s*prise)\b`,
  String.raw`\bweak\s+(?:king|back\s*rank|squares?)\b`,
  String.raw`\bdeflect(?:ion|ing)?\b`,
  String.raw`\bremoving\s+the\s+defender\b`,
]);
export function isTacticsQuestion(ask: string | undefined): boolean {
  return !!ask && TACTICS_QUESTION_RE.test(ask);
}

/** A POSITION-ASSESSMENT question — "who's winning?", "how do I stand here?",
 *  "what's the eval?", "is this good/bad for me?", "what's going on in this
 *  position?". Phase 1 (the "who's winning / eval" row): answered from Stockfish
 *  eval + the top live-tactics fact via `assemblePositionAssessment` → voiceFacts.
 *  Deliberately position-scoped phrasings ONLY — it must NOT swallow "how am I
 *  improving" (that's `isProgressQuestion`, about the student over time) or
 *  "what should I play" (`isBestMoveQuestion`). */
const POSITION_ASSESSMENT_RE = anyOf([
  String.raw`\bwho(?:'?s| is| has)\s+(?:winning|better|worse|ahead|on\s+top|the\s+(?:advantage|edge|initiative|upper\s+hand))\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?eval(?:uation)?\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:score|assessment|verdict)\b`,
  String.raw`\b(?:am\s+i|are\s+we)\s+(?:better|worse|winning|losing|ahead|behind|equal|fine|ok(?:ay)?|in\s+trouble|in\s+good\s+shape)\b`,
  String.raw`\bis\s+(?:this|that|it|the|my)\s+(?:position\s+)?(?:good|bad|better|worse|winning|won|losing|lost|equal|level|balanced|fine|ok(?:ay)?|drawish|close|unclear|dangerous)\b`,
  String.raw`\bhow\s+(?:do\s+i|am\s+i)\s+(?:stand|standing|doing\s+here)\b`,
  String.raw`\bwhere\s+do\s+i\s+stand\b`,
  String.raw`\bhow(?:'?s| is)?\s+(?:my|the)\s+position\b`,
  String.raw`\bhow\s+(?:good|bad)\s+is\s+(?:my|this|the)\s+position\b`,
  String.raw`\bassess(?:\s+(?:this|the\s+position))?\b`,
  String.raw`\bevaluate\s+(?:this|the\s+position)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+going\s+on\s+(?:here|in\s+this)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:situation|status)\b`,
  String.raw`\bwho\s+stands\s+better\b`,
  String.raw`\bhow\s+(?:bad|good)\s+is\s+(?:it|this)\b`,
  String.raw`\bam\s+i\s+(?:up|down)\s+(?:material|a\s+pawn|a\s+piece|the\s+exchange)\b`,
  String.raw`\bwho\s+(?:has|holds)\s+(?:the\s+)?(?:edge|advantage|initiative|better\s+position)\b`,
  String.raw`\bis\s+(?:it|this)\s+(?:lost|won|winning|losing|equal|level|holdable)\b`,
  String.raw`\bhow\s+much\s+(?:better|worse|ahead|behind)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:engine\s+)?(?:eval|number|advantage)\b`,
]);
export function isPositionAssessmentQuestion(ask: string | undefined): boolean {
  return !!ask && POSITION_ASSESSMENT_RE.test(ask);
}

/** A "HOW DO MASTERS PLAY THIS?" / "most popular move?" question — Phase 4.
 *  The master-play lookup has the real top moves + frequencies; the grounding
 *  inversion voices them via `assembleMasterPlayAnswer` so the LLM never
 *  fabricates a frequency. Distinct from `isBestMoveQuestion` (the ENGINE's
 *  best move) — this is about master PRACTICE / popularity. */
const MASTER_PLAY_QUESTION_RE = anyOf([
  String.raw`\bwhat\s+do\s+(?:the\s+)?(?:masters?|grandmasters?|gms?|pros?|professionals?|top\s+players?|strong\s+players?|titled\s+players?|they)\s+(?:play|do|prefer|choose|continue|go\s+for|opt\s+for|favou?r)\b`,
  String.raw`\bhow\s+do\s+(?:the\s+)?(?:masters?|grandmasters?|gms?|pros?|top\s+players?)\s+(?:play|continue|handle|treat|approach|meet)\b`,
  String.raw`\bmost\s+(?:popular|common|played|frequent|usual|tested)\s+(?:move|continuation|line|choice|reply|response)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:main|book|theoretical|critical|principal|standard|usual|normal)\s+(?:line|move|continuation|reply)\b`,
  String.raw`\bwhat\s+do(?:es)?\s+(?:the\s+)?(?:books?|database|theory|stats?|data|engine\s+stats?)\s+say\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?theory(?:\s+here|\s+say)?\b`,
  String.raw`\bmain\s*line\b`,
  String.raw`\bbook\s+move\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:usually|typically|normally|commonly)\s+played\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:played|standard|normal)\s+(?:here|in\s+this)\b`,
  String.raw`\bhow\s+is\s+(?:this|it)\s+(?:usually|normally|typically)\s+(?:played|met|handled|answered)\b`,
  String.raw`\bwhat\s+do\s+the\s+(?:best|elite|top)\s+players?\b`,
  String.raw`\bbest\s+by\s+test\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:engine|database)\s+(?:top|favou?rite)\b`,
]);
export function isMasterPlayQuestion(ask: string | undefined): boolean {
  return !!ask && MASTER_PLAY_QUESTION_RE.test(ask);
}

/** An ENDGAME question — "can I win this?", "is this a draw?", "how do I hold
 *  this ending?". Phase 5: the answer is the SYZYGY TABLEBASE (literal truth for
 *  ≤7-piece endings), voiced via `assembleEndgameAnswer`. The interception gates
 *  on `lookupTablebase` returning a hit (≤7 pieces), so this detector can be
 *  broad on the endgame-verdict shape; a non-endgame position falls through to
 *  the engine-eval path. */
const ENDGAME_QUESTION_RE = anyOf([
  String.raw`\bend(?:game|ing)s?\b`,
  String.raw`\bcan\s+i\s+(?:win|hold|draw|save|defend|convert|promote|queen)\b`,
  String.raw`\bhow\s+(?:do\s+i|to)\s+(?:win|hold|draw|convert|defend|promote|queen)\s+(?:this|it|the)?\b`,
  String.raw`\bis\s+this\s+(?:a\s+)?(?:theoretical(?:ly)?\s+)?(?:win|won|winning|draw|drawn|lost|losing|holdable|defensible)\b`,
  String.raw`\bis\s+(?:this|it)\s+(?:winning|won|drawn|drawish|lost)(?:\s+for\s+me)?\b`,
  String.raw`\b(?:theoretical(?:ly)?|tablebase)\b`,
  String.raw`\bcan\s+(?:this|it)\s+be\s+(?:won|held|drawn|saved)\b`,
  String.raw`\bis\s+(?:this|it)\s+winnable\b`,
  String.raw`\bcan\s+i\s+save\s+(?:this|it|the\s+game)\b`,
  String.raw`\b(?:rook|pawn|king|queen|bishop|knight|minor[-\s]?piece)\s+(?:and\s+\w+\s+)?end(?:game|ing)\b`,
  String.raw`\bopposite[-\s]?colou?red?\s+bishops?\b`,
  String.raw`\bhow\s+do\s+i\s+(?:convert|finish|win)\s+(?:from\s+here|this\s+(?:ending|endgame))\b`,
  String.raw`\bking\s+and\s+pawn\b`,
]);
export function isEndgameQuestion(ask: string | undefined): boolean {
  return !!ask && ENDGAME_QUESTION_RE.test(ask);
}

/** A PRO-GAME question — "how does Naroditsky play this?", "show me his games
 *  here", "what does the pro do in this line?". Phase 4: the answer is the
 *  player's REAL game corpus (pro-game-references → LivePlayerGamesContext),
 *  voiced via `assemblePlayerGamesAnswer`. The interception gates on that
 *  context being PRESENT (only loaded on pro-opening / opening-signal turns),
 *  so this detector can be broad on the "how does X play / show me X's games"
 *  shape without name-matching every pro. Distinct from `isMasterPlayQuestion`
 *  (aggregate master practice) — this is ONE player's actual games. */
const PLAYER_GAMES_QUESTION_RE = anyOf([
  String.raw`\bhow\s+does\s+(?:he|she|they|\w+)\s+(?:play|handle|treat|approach|continue|meet)\b`,
  String.raw`\b(?:show|see|find|pull\s+up|got)\s+(?:me\s+)?(?:his|her|their|\w+'?s)\s+games?\b`,
  String.raw`\bwhat\s+does\s+(?:he|she|they|the\s+pro|\w+)\s+(?:do|play|prefer|choose)\s+(?:here|in\s+this|in\s+the)\b`,
  String.raw`\bwhat\s+(?:did|has)\s+(?:he|she|they|\w+)\s+(?:play(?:ed)?|do(?:ne)?)\b`,
  String.raw`\bhas\s+(?:he|she|they|\w+)\s+(?:ever\s+)?played\s+(?:this|here)\b`,
  String.raw`\b\w+'s\s+(?:real\s+)?games?\b`,
  String.raw`\b(?:his|her|their)\s+(?:real\s+|actual\s+|own\s+)?games?\b`,
  String.raw`\bdid\s+(?:he|she|they|\w+)\s+(?:play|face|win\s+with)\b`,
  String.raw`\b(?:his|her|their)\s+(?:repertoire|lines?|games\s+here)\b`,
  String.raw`\bpull\s+(?:up\s+)?(?:his|her|their|\w+'?s)\b`,
  String.raw`\bhow\s+did\s+(?:he|she|they|\w+)\s+(?:win|handle|beat)\b`,
]);
export function isPlayerGamesQuestion(ask: string | undefined): boolean {
  return !!ask && PLAYER_GAMES_QUESTION_RE.test(ask);
}

/** A CONCEPT / DEFINITION question — "what's a fork?", "explain zwischenzug",
 *  "what does zugzwang mean?". Phase 5: the answer is the injected BOOK corpus
 *  (chess-concepts.json), voiced via `assembleConceptAnswer` → voiceFacts —
 *  never the LLM's training memory. This matches only the DEFINITIONAL shape
 *  and excludes position-specific cues ("is there a fork HERE", "am I in
 *  danger") so it doesn't collide with `isTacticsQuestion`; the interception
 *  then confirms a real concept token via `detectConceptsInText`. */
const CONCEPT_QUESTION_RE = anyOf([
  String.raw`\bwhat(?:'?s| is| are| does)\s+(?:a|an|the\s+)?[a-z]+`,
  String.raw`\bwhat\s+do\s+you\s+mean\s+by\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:meaning|definition)\s+of\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+difference\s+between\b`,
  String.raw`\bexplain\b`,
  String.raw`\bdefine\b`,
  String.raw`\b(?:tell|teach)\s+me\s+about\b`,
  String.raw`\bdescribe\b`,
  String.raw`\bwhat\s+does\s+\w+\s+mean\b`,
  String.raw`\bhow\s+does\s+(?:a|an|the)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:idea|point|purpose|concept)\s+(?:behind|of)\b`,
  String.raw`\bwhy\s+(?:is|are)\s+(?:a\s+|an\s+|the\s+)?(?:[a-z]+\s+){1,3}(?:good|important|strong|useful|bad|weak|better|worse)\b`,
  String.raw`\bwhat\s+(?:are\s+)?(?:the\s+)?principles?\b`,
]);
const CONCEPT_POSITIONAL_CUE_RE =
  /\b(?:here|this\s+position|on\s+the\s+board|right\s+now|in\s+this|my\s+(?:position|move)|best\s+move|should\s+i\s+play)\b/i;
export function isConceptQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // "what's MY rating / record / strengths / blunder rate …" is a self-knowledge
  // question, never a concept-definition — the broad CONCEPT_QUESTION_RE shape
  // ("what's <word>") would otherwise over-match every personal-stat question
  // (David 2026-07-04 stress test). A concept ask is "what's a fork", not "my X".
  if (/^\s*what(?:'?s| is| are)\s+my\b/i.test(ask)) return false;
  return CONCEPT_QUESTION_RE.test(ask) && !CONCEPT_POSITIONAL_CUE_RE.test(ask);
}

/** A STUDENT-PROGRESS question — "am I improving?", "what should I work on?",
 *  "what are my weaknesses?", "how am I doing?", "my bad habits". The answer is
 *  the student's OWN computed history (their persisted bad-habit profile), so
 *  the grounding inversion (Phase 6) routes it through `assembleProgressAnswer`
 *  → voiceFacts. The LLM voices the student's real data; it invents no weakness. */
// Reusable fragments for the progress/weakness router (the most-worded ask).
// The verb surface is exhaustive by design (David 2026-07-04: "use a theorist
// to fill all possible verbs") — morphological, phrasal, and informal variants,
// UK/US spellings. Split into two sets so an opening OBJECT can't slip through:
//
//  • IMPROVE_VERBS — recommendation-safe in EVERY frame (they don't take a
//    named opening as a teach object, so "I want to work on X" is always a
//    training ask, never "teach me opening X").
//  • REC_VERBS — verbs that CAN take an opening object ("learn the Sicilian",
//    "study the London"). Allowed ONLY in interrogative recommendation frames
//    ("what should I learn?", "what to study next?") where such an object is
//    ungrammatical — kept OUT of the bare-desire frame so "I want to learn the
//    Caro-Kann" stays a teach request (opening resolution runs first anyway).
const IMPROVE_VERBS = String.raw`(?:work\s+(?:on|at|through)|improve(?:\s+on)?|practi[sc]e|focus\s+on|get\s+(?:better|good|sharper)(?:\s+at)?|fix|address|sharpen|hone|strengthen|grind|polish|refine|prioriti[sz]e|brush\s+up(?:\s+on)?|shore\s+up|bone\s+up(?:\s+on)?|read\s+up(?:\s+on)?|level\s+up|tighten\s+up|iron\s+out|build\s+up|dial\s+in|plug|patch\s+up|clean\s+up|firm\s+up|beef\s+up)`;
const REC_VERBS = String.raw`(?:train|learn|study|master|develop|review|prep(?:are)?)`;
const ANY_TRAIN_VERB = String.raw`(?:` + IMPROVE_VERBS + String.raw`|` + REC_VERBS + String.raw`)`;
const WEAKNESS_NOUNS = String.raw`(?:weakness(?:es)?|weak\s+(?:spots?|points?|areas?|aspects?|parts?|sides?|links?|zones?)|weakest\s+(?:spot|point|area|aspect|part|skill|move|link|element|side|phase|stage)|flaws?|shortcomings?|deficienc(?:y|ies)|deficits?|blind\s+spots?|achilles(?:'?s)?\s+heel|leaks?|holes?|gaps?|sticking\s+points?|bad\s+habits?|recurring\s+(?:mistakes?|errors?|patterns?)|common\s+(?:mistakes?|errors?)|repeated\s+(?:mistakes?|errors?)|kryptonite|downfall|undoing|soft\s+spots?|nemesis|bugbear|b[eê]te\s+noire|stumbling\s+blocks?|trouble\s+(?:spots?|areas?)|problem\s+areas?|pain\s+points?|failings?|limitations?|vulnerabilit(?:y|ies))`;
// weak / poor / struggle predicates (with in/at/on/with prepositions)
const WEAK_PRED = String.raw`(?:weak(?:est)?|bad|worst|poor|terrible|awful|horrible|hopeless|useless|rubbish|crap(?:py)?|garbage|trash|shaky|rough|suck(?:s|y)?|stink(?:s|y)?|not\s+(?:good|great))`;
const PROGRESS_QUESTION_RE = anyOf([
  // ── "am I improving / how am I doing" (progress-over-time) ──
  String.raw`\bam\s+i\s+(?:improving|getting\s+(?:better|worse)|progressing|developing|growing|any\s+good|good\s+enough|getting\s+anywhere)\b`,
  String.raw`\bhow\s+am\s+i\s+(?:doing|progressing|playing|improving|developing|getting\s+on)\b`,
  String.raw`\bhow(?:'?s| is| has)\s+my\s+(?:game|play|chess|progress|improvement)\b`,
  String.raw`\bhow\s+(?:can|do|should|could|might)\s+i\s+(?:get\s+better|improve|progress|level\s+up|get\s+good)\b`,
  // ── recommendation: "what should I train/work on/learn (next)?" ──
  String.raw`\bwhat\s+(?:should|shall|do|can|could|would|must|ought)\s+i\s+(?:(?:need|want|have|like|try|be)\s+to\s+)?` + ANY_TRAIN_VERB + String.raw`\b`,
  // progressive "-ing" recommendation ("what should I be working on")
  String.raw`\bwhat\s+(?:should|am|do)\s+i\s+(?:be\s+)?(?:working\s+on|focusing\s+on|practi[sc]ing|improving|studying|training|learning|honing|sharpening|grinding|developing)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:best|most\s+important|first|next)\s+thing\s+to\s+` + ANY_TRAIN_VERB + String.raw`\b`,
  String.raw`\bwhat\s+to\s+` + ANY_TRAIN_VERB + String.raw`\b`,
  String.raw`\bwhat\s+(?:area|part|phase|aspect|skill)\s+(?:of\s+my\s+(?:game|play|chess)\s+)?(?:should\s+i|do\s+i|to)\s+` + ANY_TRAIN_VERB + String.raw`\b`,
  // ── recommendation: bare desire ("I want to improve / need to work on") ──
  String.raw`\b(?:need|want|wanna|have|trying|tryna|gotta|got\s+to|gonna|hoping|looking|keen)\s+(?:to\s+)?` + IMPROVE_VERBS + String.raw`\b`,
  String.raw`\bhelp\s+me\s+(?:` + IMPROVE_VERBS + String.raw`|get\s+better|improve|level\s+up)\b`,
  String.raw`\b(?:tell|show|point)\s+me\s+(?:what\s+to\s+` + ANY_TRAIN_VERB + String.raw`|where\s+to\s+focus|at\s+what\s+to\s+` + ANY_TRAIN_VERB + String.raw`)\b`,
  String.raw`\b(?:give|suggest|recommend)\s+(?:me\s+)?(?:something|a\s+plan|a\s+focus|an?\s+area|what)\s+to\s+(?:` + ANY_TRAIN_VERB + String.raw`|drill|practi[sc]e)\b`,
  // ── focus / priority ──
  String.raw`\b(?:where|what)\s+should\s+(?:i\s+focus|my\s+focus\s+be|i\s+(?:put|spend)\s+my\s+(?:time|energy|effort))\b`,
  String.raw`\bwhat\s+(?:area|part|phase|aspect|skill)\s+(?:of\s+my\s+(?:game|play|chess)\s+)?needs?\s+(?:the\s+most\s+)?(?:work|attention|improvement)\b`,
  String.raw`\bwhat\s+needs?\s+(?:the\s+most\s+)?(?:work|improvement|attention)\b`,
  String.raw`\b(?:study|training|practice)\s+plan\b`,
  // ── weakness NOUNS ──
  String.raw`\b(?:my|the)\s+(?:biggest\s+|main\s+|worst\s+|greatest\s+|number\s+one\s+|top\s+)?` + WEAKNESS_NOUNS + String.raw`\b`,
  String.raw`\b` + WEAKNESS_NOUNS + String.raw`\s+(?:in|of|with)\s+my\s+(?:game|play|chess)\b`,
  String.raw`\bwhat\s+(?:are|is|'?s)\s+my\s+(?:biggest\s+|main\s+|worst\s+|top\s+)?` + WEAKNESS_NOUNS + String.raw`\b`,
  String.raw`\bbiggest\s+(?:weakness|mistake|problem|issue|flaw|leak|gap)\b`,
  String.raw`\bweakest\s+(?:aspect|part|area|point|spot|skill|element|side|link|piece|phase|stage)\s+of\s+my\s+(?:game|play|chess)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?weakest\s+(?:aspect|part|area|point|spot|side|phase|link)\b`,
  // NB: "strengths" / "strong points" are NOT here — they route to the dedicated
  // isStrengthsQuestion path (David 2026-07-04), so "what am I good at" stops
  // getting a weakness-dump. Progress owns only progress/improvement wording.
  String.raw`\b(?:my|the)\s+(?:progress|improvement)\b`,
  // ── weak / struggle PREDICATES (self, aggregate) ──
  String.raw`\bwhat\s+(?:am\s+i|i'?m|do\s+i)\s+` + WEAK_PRED + String.raw`\s+(?:at|in|on|with)\b`,
  String.raw`\bwhere\s+(?:am\s+i|i'?m|do\s+i)\s+(?:the\s+)?(?:` + WEAK_PRED + String.raw`|struggl(?:e|ing)|los(?:e|ing)|failing|need\s+work|go(?:ing)?\s+wrong|mess(?:ing)?\s+up|blunder(?:ing)?|fall(?:ing)?\s+short|drop(?:ping)?\s+(?:points?|games?))\b`,
  // positive predicates (good/best/strong) route to isStrengthsQuestion; progress
  // keeps only the weakness predicates here.
  String.raw`\bwhat\s+(?:am\s+i|do\s+i)\s+(?:bad|worst|weak)\s+at\b`,
  // informal self-predicate ("I suck at endgames", "I'm terrible at tactics",
  // "I'm no good at endings") — a plain statement of a weakness is a diagnosis.
  String.raw`\bi\s+(?:really\s+|totally\s+|just\s+)?(?:suck|stink|blow|bomb)\s+(?:at|in|with)\b`,
  String.raw`\bi'?m\s+(?:really\s+|so\s+|just\s+)?(?:terrible|awful|horrible|hopeless|useless|garbage|trash|rubbish|bad|no\s+good|weak|shaky)\s+(?:at|in|with)\b`,
  // "what's my worst/weakest opening/line/phase" — an opening-WEAKNESS diagnosis
  // (the student's worst-scoring line), NOT a request to teach that opening.
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:worst|weakest)\s+(?:opening|line|variation|defen[cs]e|phase|piece|colou?r)\b`,
  // aggregate error habits — guarded by keep/always so a SINGLE-game "why did I
  // lose that game" (single-game review) does NOT match.
  String.raw`\b(?:i\s+)?(?:keep|always|constantly|usually|often|repeatedly)\s+(?:losing|blunder(?:ing)?|messing\s+up|screwing\s+up|going\s+wrong|hanging\s+(?:pieces|my\s+\w+|stuff)|dropping\s+(?:pieces|points))\b`,
  String.raw`\bwhat\s+(?:do\s+i|am\s+i)\s+(?:keep\s+)?(?:doing|getting)\s+wrong\b`,
  String.raw`\bwhat\s+(?:mistakes?|errors?)\s+do\s+i\s+(?:keep|always|repeatedly|usually)\s+(?:make|making|repeat)\b`,
  String.raw`\bwhy\s+(?:do\s+i|can'?t\s+i|am\s+i)\s+(?:keep\s+|always\s+|constantly\s+)?(?:los(?:e|ing)|(?:not\s+)?improv(?:e|ing)?|stuck|blunder(?:ing)?)\b`,
  String.raw`\bwhich\s+(?:phase|part|area|stage)\s+(?:do\s+i|am\s+i)\s+(?:lose|los(?:e|ing)|weak(?:est)?|struggl(?:e|ing)|worst)\b`,
  // ── "holding me back / costing me" ──
  String.raw`\bwhat(?:'?s| is)?\s+(?:holding|keeping|stopping|capping|limiting|dragging)\s+(?:me|my\s+(?:rating|game|chess|progress))(?:\s+(?:back|down|from|up))?\b`,
  String.raw`\bwhat\s+(?:trips|throws|holds)\s+me\s+(?:up|back)\b`,
  String.raw`\bwhat\s+(?:keeps?\s+)?(?:costing|losing)\s+me\s+(?:games?|points?|rating|elo)\b`,
  // ── topic-scoped weakness ("what tactics am I weak in", "weak in endgames") ──
  String.raw`\bwhat\s+(?:kind\s+of\s+)?(?:tactics?|tactical|openings?|repertoire|endgames?|endings?|middlegames?|calculation|positional|strategy|defen[cs]e|attack(?:ing)?)\b[\s\w']{0,20}\b(?:am\s+i|i'?m|do\s+i)\s+(?:` + WEAK_PRED + String.raw`|struggl(?:e|ing)|los(?:e|ing)|miss(?:ing)?)\b`,
  String.raw`\b(?:` + WEAK_PRED + String.raw`|struggl(?:e|ing))\s+(?:at|in|on|with)\s+(?:my\s+)?(?:tactics?|tactical|openings?|repertoire|endgames?|endings?|middlegames?|calculation|positional|strategy|defen[cs]e|attack(?:ing)?|conversion|time\s+management|blunders?|forks?|pins?|skewers?|back[\s-]?rank|king\s+safety|pawn\s+structures?)\b`,
  // ── explicit "diagnose my chess" ──
  String.raw`\b(?:diagnose|analy[sz]e|assess|evaluate)\s+my\s+(?:chess|game|play|weakness\w*)\b`,
]);
export function isProgressQuestion(ask: string | undefined): boolean {
  return !!ask && PROGRESS_QUESTION_RE.test(ask);
}

/** An OPENING-PROFILE question — "what's my strongest / favorite / most-played
 *  / weakest opening?". Distinct from `isProgressQuestion` (tactical/positional
 *  weakness THEMES): this asks WHICH OPENING, answered from the repertoire's
 *  drill accuracy + real game counts (getStrongestOpenings / getMostPlayedOpenings
 *  / getWeakestOpenings) via `assembleOpeningProfileAnswer`. The coach used to
 *  punt ("only you can tell me your favorite") though the data is on file — the
 *  deterministic data is now wired in (David 2026-07-04). */
const OPENING_PROFILE_RE = anyOf([
  String.raw`\bwhat(?:'?s| is| are)?\s+my\s+(?:(?:biggest|main|number\s+one|top)\s+)?(?:strongest|best|favou?rite|go[\s-]?to|most[\s-]?played|most[\s-]?used|weakest|worst)\s+(?:opening|openings|line|lines|defen[cs]e|repertoire)\b`,
  String.raw`\bmy\s+(?:strongest|best|favou?rite|go[\s-]?to|most[\s-]?played|most[\s-]?used|weakest|worst)\s+(?:opening|openings|defen[cs]e)\b`,
  String.raw`\bwhich\s+opening\s+(?:do\s+i|am\s+i)\s+(?:play|use)\s+(?:the\s+)?(?:most|best)\b`,
  String.raw`\bwhat\s+opening\s+(?:am\s+i|do\s+i)\s+(?:play\s+(?:the\s+)?most|best|strongest|worst|weakest)\b`,
  String.raw`\bwhat\s+(?:opening|openings)\s+do\s+i\s+play\s+(?:the\s+)?most\b`,
  String.raw`\bwhich\s+opening\s+suits\s+me\b`,
  String.raw`\b(?:my\s+)?bread\s+and\s+butter\s+opening\b`,
  String.raw`\bwhat\s+do\s+i\s+open\s+with\b`,
]);
export function isOpeningProfileQuestion(ask: string | undefined): boolean {
  return !!ask && OPENING_PROFILE_RE.test(ask);
}
/** Which slice of the opening profile the question asks for. */
export function openingProfileKind(ask: string | undefined): 'strongest' | 'favorite' | 'weakest' {
  const a = (ask ?? '').toLowerCase();
  if (/\b(?:weakest|worst)\b/.test(a)) return 'weakest';
  if (/\b(?:favou?rite|go[\s-]?to|most[\s-]?played|most[\s-]?used|play\s+(?:the\s+)?most)\b/.test(a)) return 'favorite';
  return 'strongest';
}

/** A STATS / RECORD question — "what's my rating / record / win rate?", "how
 *  many games have I won?", "how am I doing overall?". Answered from the
 *  student's own game history (getOverviewInsights + rating) via
 *  assembleStatsAnswer (David 2026-07-04). Distinct from progress (weakness
 *  themes) and opening-profile (which opening). */
const STATS_QUESTION_RE = anyOf([
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:current\s+)?(?:rating|elo|rank)\b`,
  String.raw`\bmy\s+(?:chess\s+)?(?:current\s+)?(?:rating|elo)\b`,   // bare "my (chess) rating"
  String.raw`\bwhat\s+rating\s+am\s+i\b`,                            // "what rating am I"
  String.raw`\bwin\s*[\/-]\s*loss\b|\bwin[\s-]loss\b`,               // "win/loss", "win-loss"
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:level|track\s+record)\b`,
  String.raw`\bhow\s+strong\s+(?:a\s+player\s+)?am\s+i\b`,
  String.raw`\bdo\s+i\s+win\s+more\s+than\s+i\s+lose\b`,
  String.raw`\bam\s+i\s+any\s+good\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:win[\s-]?rate|record|score|w[\s\/-]l|stats?|statistics)\b`,
  // bare "my …" record/win-rate phrasings (no "what's" lead-in) — incl.
  // "my w-l record" / "my w/l" (the adversarial audit's compound-question miss,
  // David 2026-07-04). "my record" alone is unambiguously a stats question.
  String.raw`\bmy\s+(?:win[\s-]?rate|(?:overall\s+|game\s+|w[\s\/-]l\s+)?record|w[\s\/-]l)\b`,
  String.raw`\bhow\s+many\s+games\s+(?:have\s+i|did\s+i|do\s+i|i'?ve)\s+(?:won|win|lost|lose|played|play|drawn|draw|drew)\b`,
  String.raw`\bhow\s+(?:many|often)\s+(?:do\s+i|have\s+i)\s+win\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:win|winning)\s+percentage\b`,
  String.raw`\bhow\s+am\s+i\s+doing\s+(?:overall|in\s+my\s+games)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:overall\s+)?(?:performance|results?)\b`,
  // bare "how good/strong am I" is a stats question — but "how good am I AT
  // tactics/endgames/…" is a skill-profile question, so exclude a trailing "at".
  String.raw`\bhow\s+(?:good|strong)\s+am\s+i\b(?!\s+(?:at|in)\b)`,
  // harder-pass slang (David 2026-07-04 stress test)
  String.raw`\b(?:gimme|give\s+me|show\s+me)\s+my\s+(?:stats|record|rating|numbers)\b`,
  String.raw`\bhow\s+many\s+(?:wins|losses|draws)\s+do\s+i\s+have\b`,
  String.raw`\bmy\s+win(?:ning)?\s+(?:percentage|percent|rate)\b`,
  String.raw`\bam\s+i\s+winning\s+more\b`,
  String.raw`\bmy\s+score\b`,
]);
export function isStatsQuestion(ask: string | undefined): boolean {
  return !!ask && STATS_QUESTION_RE.test(ask);
}

/** A STRENGTHS question — "what am I good at?", "what are my strengths?", "what
 *  do I do well?". Answered from the COMPUTED strengths (getOverviewInsights
 *  .strengths) via assembleStrengthsAnswer — the inverse of the weakness path,
 *  so "what am I good at" stops getting a weakness-dump (David 2026-07-04). */
const STRENGTHS_QUESTION_RE = anyOf([
  String.raw`\bwhat\s+(?:am\s+i|do\s+i)\s+(?:really\s+|naturally\s+)?(?:good|best|strong|great)\s+at\b`,
  String.raw`\bmy\s+(?:forte|best\s+(?:quality|qualities|asset|trait))\b`,
  String.raw`\bwhat\s+do\s+i\s+have\s+going\s+for\s+me\b`,
  String.raw`\bwhat(?:'?s| is)?\s+working\s+in\s+my\s+(?:game|play|chess)\b`,
  String.raw`\bwhat(?:'?s| is| are)?\s+my\s+(?:biggest\s+|main\s+|top\s+|greatest\s+)?strengths?\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:strong(?:est)?\s+(?:suit|point|area|skill)|best\s+(?:skill|area|part))\b`,
  String.raw`\bwhat\s+do\s+i\s+do\s+(?:well|best|right)\b`,
  String.raw`\bwhat\s+am\s+i\s+(?:really\s+)?strong\s+(?:at|in)\b`,
  String.raw`\bmy\s+(?:strengths?|strong\s+suits?|strong\s+points?)\b`,
  String.raw`\bwhere\s+do\s+i\s+excel\b`,
  String.raw`\bwhat\s+are\s+my\s+strong\s+points?\b`,
  String.raw`\b(?:tell|show)\s+me\s+what\s+i(?:'?m| am)\s+good\s+at\b`,
  String.raw`\bmy\s+best\s+(?:areas?|skills?|parts?)\b`,
  String.raw`\bwhat\s+am\s+i\s+great\s+at\b`,
]);
export function isStrengthsQuestion(ask: string | undefined): boolean {
  return !!ask && STRENGTHS_QUESTION_RE.test(ask);
}

/** An OPENING-ACCURACY question — "how accurate am I in my favorite opening?",
 *  "what's the weakest part of my opening theory I need to work on?", "which
 *  line/variation should I drill?". Answered from the WITHIN-opening data:
 *  OpeningRecord.drillAccuracy/Attempts + the weakest variation
 *  (variationAccuracy) + the most-missed position (openingWeakSpots), via
 *  assembleOpeningAccuracyAnswer (David 2026-07-04: "check accuracy throughout
 *  the opening, identify what is weakest and what I need to work on the most").
 *  Distinct from isOpeningProfileQuestion (WHICH opening) — this is HOW well /
 *  which PART within one opening. Ordered BEFORE progress in the chokepoint so
 *  "what should I work on in my opening" doesn't get a generic weakness-dump. */
const OPENING_ACCURACY_RE = anyOf([
  // "how accurate / accurately …" and "my/your accuracy …" are inherently
  // performance questions — accept them even when the opening is named without
  // the literal word "opening" ("how accurately do I play the London", "what's
  // my accuracy in the Caro-Kann"). The coachApi block resolves the target
  // opening from context / the weakest repertoire opening.
  String.raw`\bhow\s+accura(?:te|tely)\b`,
  String.raw`\b(?:my|your)\s+accura(?:te|cy)\b`,
  // "accuracy / accurate" anchored to an opening/line/theory (either order)
  String.raw`\baccura(?:te|cy)\b[^?.!]{0,50}\b(?:opening|openings|line|lines|variation|variations|repertoire|theory)\b`,
  String.raw`\b(?:opening|openings|line|lines|variation|variations|repertoire|theory)\b[^?.!]{0,50}\baccura(?:te|cy)\b`,
  // "(what) part of my opening (…work on)"
  String.raw`\bpart\s+of\s+(?:my|the)\s+opening\b`,
  // "weakest PART / line / variation" of an opening / theory
  String.raw`\bweak(?:est)?\s+(?:part|line|lines|variation|variations|sub[\s-]?line|spot|point|area|link)\b[^?.!]{0,50}\b(?:opening|openings|line|variation|theory|repertoire|prep)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+weakest\s+(?:line|variation|sub[\s-]?line)\b`,
  // "which line/variation (do I / should I) work on / improve / drill"
  String.raw`\bwhich\s+(?:opening\s+)?(?:line|lines|variation|variations|sub[\s-]?line)\s+(?:do\s+i|should\s+i|to|must\s+i)\b[^?.!]{0,40}\b(?:work\s+on|improve|study|practi[cs]e|drill|focus|shore\s+up)\b`,
  // "what (do I) need to work on … opening theory / prep / repertoire"
  String.raw`\b(?:work\s+on|improve|study|drill|shore\s+up|brush\s+up(?:\s+on)?)\b[^?.!]{0,40}\bopening\s+(?:theory|prep|preparation|repertoire|knowledge|line|lines)\b`,
  String.raw`\bimprove\s+(?:my\s+)?opening\s+(?:theory|prep|preparation|repertoire|knowledge)\b`,
  // "where am I weakest / do I slip in (the/my) opening/line"
  String.raw`\bwhere\s+(?:am\s+i|do\s+i)\s+(?:the\s+)?(?:weakest|struggl(?:e|ing)|slip(?:ping)?|go(?:ing)?\s+wrong)\b[^?.!]{0,50}\b(?:opening|openings|line|variation|repertoire)\b`,
  // "how well / accurately do I know / play (the/my) opening/line"
  String.raw`\bhow\s+(?:well|accurately)\s+do\s+i\s+(?:know|play|drill)\s+(?:the|my)\b[^?.!]{0,40}\b(?:opening|openings|line|variation|defen[cs]e|repertoire)\b`,
  String.raw`\bhow\s+(?:sharp|good|solid|strong|deep)\s+is\s+my\s+opening\b`,
  String.raw`\bam\s+i\s+solid\s+in\s+my\s+openings?\b`,
  String.raw`\bhow\s+deep\s+is\s+my\s+opening\s+knowledge\b`,
  String.raw`\bdo\s+i\s+know\s+my\s+openings?\s+well\b`,
  String.raw`\bwhere\s+does\s+my\s+opening\s+(?:prep|preparation|play|theory)\s+(?:fall\s+apart|break\s+down|end)\b`,
]);
export function isOpeningAccuracyQuestion(ask: string | undefined): boolean {
  return !!ask && OPENING_ACCURACY_RE.test(ask);
}

/** An OPENING-TRAPS question — "what traps can I use in my strongest opening?",
 *  "drill me on opening traps in my strongest opening for both colors", "what
 *  should I watch out for in the Caro-Kann?", "how do you teach these traps?".
 *  Answered from the REAL trap data on the OpeningRecord (named trapLines =
 *  weapons, warningLines = watch-out-for) via assembleOpeningTrapsAnswer, and
 *  points the student at the existing "punish lines for X" drill launch (David
 *  2026-07-04). The trap/gem/warning data is hand-authored + engine-verified
 *  (G3) — the coach names it, never invents it. */
const OPENING_TRAPS_RE = anyOf([
  // "traps / gambit traps / pitfalls" tied to openings / a repertoire / theory
  String.raw`\b(?:opening\s+)?traps?\b[^?.!]{0,50}\b(?:opening|openings|line|lines|repertoire|defen[cs]e|theory)\b`,
  String.raw`\b(?:opening|openings|line|lines|repertoire|defen[cs]e)\b[^?.!]{0,50}\btraps?\b`,
  // "what traps (can I / do I / should I) …" — a trap question on its own
  String.raw`\bwhat\s+traps?\b`,
  String.raw`\b(?:drill|teach|show|give)\s+(?:me\s+)?(?:some\s+|the\s+)?(?:opening\s+)?traps?\b`,
  String.raw`\btraps?\s+(?:can\s+i|do\s+i|should\s+i)\s+(?:use|play|spring|know)\b`,
  // "what (should I / do I) watch out for" — the anti-trap / pitfall side
  String.raw`\bwatch\s+out\s+for\b`,
  String.raw`\bwhat\s+(?:should\s+i|do\s+i\s+need\s+to)\s+(?:watch|look)\s+(?:out\s+)?for\b`,
  String.raw`\bwhat\s+(?:are\s+the\s+)?(?:common\s+)?(?:pitfalls?|traps?)\s+(?:in|of|to\s+avoid)\b`,
  String.raw`\b(?:pitfalls?|traps?)\s+(?:should\s+i\s+|to\s+)?avoid\b`,
  String.raw`\bwhat\s+(?:pitfalls?|traps?)\s+should\s+i\s+(?:avoid|know|watch)\b`,
  String.raw`\b(?:tricks?|traps?)\s+(?:in|for)\s+my\s+(?:openings?|repertoire)\b`,
  String.raw`\bwhat\s+tricks?\s+can\s+i\s+play\b`,
  String.raw`\bhow\s+do\s+i\s+trap\s+(?:my\s+)?opponent\b`,
  // "how do you teach (these) traps / what system" — the teaching-system ask
  String.raw`\bhow\s+do\s+you\s+teach\s+(?:me\s+)?(?:these|the|opening)?\s*traps?\b`,
  String.raw`\bwhat\s+system\s+(?:do\s+you|does\s+it)\s+use\b`,
]);
export function isOpeningTrapsQuestion(ask: string | undefined): boolean {
  return !!ask && OPENING_TRAPS_RE.test(ask);
}

/** True when an opening-traps question asks about the teaching SYSTEM ("how do
 *  you teach these", "what system do you use") — appends the WLPP explanation. */
export function opensTrapsSystemAsk(ask: string | undefined): boolean {
  const a = (ask ?? '').toLowerCase();
  return /\bhow\s+do\s+you\s+teach\b|\bwhat\s+system\b|\bhow\s+(?:are|do)\s+(?:these|they|the)?\s*(?:traps?\s+)?(?:taught|work)\b/.test(a);
}

/** A REVIEW-DUE / SRS question — "what's due for review today?", "how many cards
 *  do I have to review?", "what should I review?", "anything due?". Answered from
 *  the live spaced-repetition store (getDueCount + getEnrolledOpenings +
 *  getSrsDueOpenings) via assembleReviewDueAnswer, and points the student at the
 *  /openings/srs trainer (David 2026-07-04). MUST require SRS/deck/card/due/reps
 *  phrasing so it does NOT collide with the single-GAME "review my last game"
 *  intent (coachAgent `review-game`). */
const REVIEW_DUE_RE = anyOf([
  // "what's due (for review) (today)" — due is the load-bearing token
  String.raw`\bwhat(?:'?s| is)?\s+due\b`,
  String.raw`\banything\s+due\b`,
  String.raw`\b(?:any|are\s+there)\s+(?:cards?|reviews?|reps?)\s+due\b`,
  String.raw`\bdue\s+(?:for\s+review|to\s+review|today|cards?|reviews?)\b`,
  String.raw`\bcards?\s+(?:are|is)\s+due\b`,
  // "how many cards / reviews / reps (do I have) to review / due"
  String.raw`\bhow\s+many\s+(?:cards?|reviews?|reps?|flash\s?cards?)\b`,
  // "what should I review" / "what do I need to review" — REVIEW as SRS (not a game)
  String.raw`\bwhat\s+(?:should\s+i|do\s+i\s+(?:need\s+to|have\s+to))\s+review\b`,
  // explicit SRS / deck / flashcard / reps nouns
  String.raw`\b(?:my\s+)?(?:review\s+queue|review\s+pile|srs|spaced\s+repetition|flash\s?cards?|review\s+deck|woodpecker)\b`,
  String.raw`\breview\s+(?:my\s+)?(?:cards?|openings?|deck|reps?)\b`,
  String.raw`\b(?:cards?|reps?)\s+(?:to\s+review|due)\b`,
  String.raw`\bdo\s+i\s+have\s+(?:any\s+)?reviews?\b`,
  String.raw`\banything\s+to\s+review\b`,
  String.raw`\bshould\s+i\s+do\s+my\s+(?:reps|reviews?|cards|flash\s?cards)\b`,
  String.raw`\bhow\s+much\s+review\b`,
  String.raw`\b(?:are\s+)?my\s+flash\s?cards?\s+(?:ready|due)\b`,
  String.raw`\bon\s+my\s+plate\b[^?.!]{0,20}\breview\b`,
]);
export function isReviewDueQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // Guard: "review my (last) game" is the single-GAME review intent, not SRS.
  if (/\breview\s+(?:my\s+|the\s+|that\s+|this\s+|last\s+)*(?:last\s+)?game\b/i.test(ask)) return false;
  return REVIEW_DUE_RE.test(ask);
}

/** WAVE 1 "where do I go wrong" cluster (David 2026-07-04) — voice the
 *  weakness-tab numbers. Each is about the STUDENT'S OWN play over their games,
 *  distinct from the live-board tactic/endgame/position intents. */

/** "what mistakes do I make / how often do I blunder / where do I go wrong?" →
 *  assembleMistakesAnswer (getMistakeInsights). */
const MISTAKES_QUESTION_RE = anyOf([
  String.raw`\bwhat\s+(?:kind\s+of\s+)?(?:mistakes?|blunders?|errors?)\s+do\s+i\b`,
  String.raw`\bwhat(?:'?s| is| are)?\s+my\s+(?:biggest\s+|common\s+|most\s+common\s+|worst\s+|costliest\s+|typical\s+)?(?:mistakes?|blunders?|errors?)\b`,
  String.raw`\bhow\s+(?:often|much|many)\s+do\s+i\s+(?:blunder|mistake|err|go\s+wrong|hang)\b`,
  String.raw`\bhow\s+many\s+(?:blunders?|mistakes?|errors?)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:blunder|mistake|error)\s+rate\b`,
  String.raw`\bdo\s+i\s+(?:blunder|make\s+(?:a\s+lot\s+of\s+)?(?:mistakes?|blunders?|errors?)|hang\s+(?:pieces|stuff))\b`,
  String.raw`\bwhere\s+do\s+i\s+(?:go\s+wrong|slip|mess\s+up|blunder)\b`,
  String.raw`\bwhat\s+do\s+i\s+do\s+wrong\b`,
  String.raw`\bmy\s+(?:costliest|worst)\s+(?:mistake|blunder|move)\b`,
  String.raw`\bwhat\s+goes\s+wrong\b`,
  String.raw`\bam\s+i\s+blundering\b`,
  String.raw`\bhow\s+much\s+do\s+i\s+blunder\b`,
  String.raw`\bwhat\s+(?:do\s+i|am\s+i)\s+(?:mess|screw|botch)(?:ing)?\s+up\b`,
  String.raw`\bmy\s+play\s+(?:sloppy|careless)\b|\bwhere(?:'?s| is)?\s+my\s+play\s+(?:sloppy|careless|weak)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+costing\s+me\s+games\b`,
  String.raw`\bdo\s+i\s+(?:drop|hang|lose)\s+pieces\b`,
]);
export function isMistakesQuestion(ask: string | undefined): boolean {
  return !!ask && MISTAKES_QUESTION_RE.test(ask);
}

/** "how are my tactics / what tactics do I miss?" → assembleTacticsProfileAnswer
 *  (getTacticInsights). Guarded against the LIVE-board "is there a tactic here"
 *  (isTacticsQuestion) — this is about the student's tactics OVER TIME. */
const TACTICS_PROFILE_RE = anyOf([
  String.raw`\bhow\s+(?:are|is|good\s+are|good\s+is)\s+my\s+tactics?\b`,
  String.raw`\bwhat\s+tactics?\s+do\s+i\s+miss\b`,
  String.raw`\bdo\s+i\s+miss\s+(?:tactics?|combinations?)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+tactical\s+(?:awareness|accuracy|rate|profile|weakness(?:es)?)\b`,
  String.raw`\bam\s+i\s+(?:good|weak|bad)\s+at\s+tactics?\b`,
  String.raw`\bwhat\s+(?:tactic|motif|pattern)\s+do\s+i\s+miss\s+(?:the\s+)?most\b`,
  String.raw`\bmy\s+(?:tactical\s+)?(?:weaknesses?|blind\s+spots?)\s+(?:in\s+)?tactics?\b`,
  String.raw`\bdo\s+i\s+(?:see|spot|catch|overlook|miss)\s+tactics?\b`,
  String.raw`\bare\s+my\s+tactics\b`,
  String.raw`\bhow\s+good\s+am\s+i\s+at\s+tactics?\b`,
  String.raw`\bmy\s+tactic(?:al)?\s+(?:accuracy|rate|vision|eye|sight)\b`,
  String.raw`\b(?:am\s+i\s+)?sharp\s+tactically\b`,
  String.raw`\bdo\s+i\s+(?:find|spot|see|miss)\s+combinations?\b`,
  String.raw`\bam\s+i\s+missing\s+(?:shots|tactics|combinations?)\b`,
]);
export function isTacticsProfileQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // Live-board tactic questions ("is there a tactic here / in this position")
  // belong to isTacticsQuestion — never here.
  if (/\b(?:here|in\s+this\s+position|right\s+now|on\s+the\s+board)\b/i.test(ask)) return false;
  return TACTICS_PROFILE_RE.test(ask);
}

/** "which phase am I weakest in / where do I lose / how's my endgame play?" →
 *  assemblePhaseProfileAnswer (phaseAccuracy + criticalMomentsAccuracy). Guarded
 *  against the LIVE-board endgame question (isEndgameQuestion = "is THIS endgame
 *  winning"). */
const PHASE_QUESTION_RE = anyOf([
  String.raw`\bwhich\s+phase\s+(?:am\s+i|do\s+i)\b`,
  String.raw`\bwhat\s+phase\s+do\s+i\s+(?:lose|struggle|blunder|play\s+worst)\b`,
  String.raw`\bwhat\s+(?:part|stage)\s+of\s+the\s+game\s+(?:am\s+i|do\s+i)\b`,
  String.raw`\bwhere\s+do\s+i\s+lose\s+(?:my\s+)?games?\b`,
  String.raw`\bhow(?:'?s| is| are)\s+my\s+(?:opening|middlegame|middle\s+game|endgame|end\s+game)s?(?:\s+(?:play|accuracy|game))?\b`,
  String.raw`\bhow\s+(?:good|bad|strong|weak)\s+(?:is|are)\s+my\s+(?:opening|middlegame|endgame)s?\b`,
  String.raw`\bam\s+i\s+(?:better|worse|weaker|stronger)\s+in\s+the\s+(?:opening|middlegame|endgame)\b`,
  String.raw`\bmy\s+(?:worst|weakest|best|strongest)\s+phase\b`,
  String.raw`\baccuracy\s+by\s+phase\b`,
  String.raw`\bwhen\s+do\s+i\s+lose\b`,
  String.raw`\bis\s+my\s+(?:opening|middlegame|middle\s+game|endgame|end\s+game)\s+(?:weak|bad|strong|good|solid|shaky)\b`,
  String.raw`\bwhere\s+do(?:es)?\s+(?:i|my\s+game)\s+(?:drop\s+the\s+ball|fall\s+apart|collapse|break\s+down)\b`,
  String.raw`\bdo\s+i\s+(?:fade|tire|weaken)\s+in\s+(?:long\s+games|the\s+endgame)\b`,
  String.raw`\b(?:opening|middlegame)\s+or\s+(?:middlegame|endgame)\s+player\b`,
  String.raw`\bwhich\s+(?:part|stage|phase)\s+of\s+(?:the\s+game|my\s+game)\b`,
]);
export function isPhaseQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // "is this endgame winning / how do I hold this" is the live tablebase intent.
  if (/\bthis\s+(?:endgame|position)\b|\bhold\s+this\b|\bwinning\s+here\b/i.test(ask)) return false;
  return PHASE_QUESTION_RE.test(ask);
}

/** WAVE 2 — the REPERTOIRE-GAP cluster (David 2026-07-04: "I LOVE THIS STYLE OF
 *  QUESTION!"). "where do I leave theory / go out of book?", "what's a hole in
 *  my repertoire / what do I have no answer for?", "what opening should I learn
 *  next?" → assembleRepertoireGapAnswer (getOpeningInsights: off-book rate +
 *  worst matchups). Distinct from opening-profile (which opening I PLAY best) and
 *  opening-accuracy (how well I drill ONE opening). */
const REPERTOIRE_GAP_RE = anyOf([
  // out-of-book
  String.raw`\b(?:leave|leaving|out\s+of|off)\s+(?:the\s+)?(?:book|theory|prep(?:aration)?)\b`,
  String.raw`\bwhere\s+do\s+i\s+(?:leave|drift|deviate|go\s+off)\b`,
  String.raw`\bhow\s+(?:often|deep)\s+(?:do\s+i|am\s+i)\s+(?:go\s+off|leave|in|out\s+of)\s+(?:book|prep|theory)\b`,
  // hole / no answer
  String.raw`\b(?:hole|holes|gap|gaps|weak\s+spot)\s+(?:in|of)\s+my\s+(?:repertoire|prep(?:aration)?|openings?)\b`,
  String.raw`\bwhat\s+(?:do\s+i|don'?t\s+i)\s+(?:have\s+)?no\s+answer\s+(?:for|to|against)\b`,
  String.raw`\bwhat\s+am\s+i\s+(?:not\s+(?:prepared|ready)|unprepared)\s+(?:for|against)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+missing\s+(?:from|in)\s+my\s+(?:repertoire|prep|openings?)\b`,
  String.raw`\bwhat\s+do\s+i\s+struggle\s+(?:against|with)\b`,
  String.raw`\bwhat\s+(?:openings?\s+)?(?:do\s+i|give\s+me)\s+(?:the\s+most\s+)?(?:trouble|problems?)\b`,
  String.raw`\bwhat\s+gives\s+me\s+(?:the\s+)?(?:most\s+)?trouble\b`,
  String.raw`\bneed\s+an?\s+answer\s+(?:to|for|against)\b`,
  String.raw`\bwhere(?:'?s| is)?\s+(?:the\s+)?gap\s+in\s+my\s+(?:prep|repertoire|openings?)\b`,
  String.raw`\bcatch\s+me\s+off\s+guard\b`,
  String.raw`\bwhere\s+am\s+i\s+(?:exposed|vulnerable)\b`,
  String.raw`\bwhat\s+do\s+opponents?\s+get\s+me\s+with\b`,
  // learn-next
  String.raw`\bwhat\s+opening\s+should\s+i\s+(?:learn|study|add)\s+(?:next|to\s+my\s+repertoire)?\b`,
  String.raw`\bwhat\s+should\s+i\s+(?:learn|add\s+to\s+my\s+repertoire)\s+next\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?next\s+opening\s+(?:for\s+me\s+)?to\s+(?:learn|study)\b`,
  String.raw`\bwhat\s+should\s+i\s+add\s+to\s+my\s+repertoire\b`,
]);
export function isRepertoireGapQuestion(ask: string | undefined): boolean {
  return !!ask && REPERTOIRE_GAP_RE.test(ask);
}
/** Which slice of the repertoire-gap answer to compute. */
export function repertoireGapKind(ask: string | undefined): 'out-of-book' | 'hole' | 'learn-next' {
  const a = (ask ?? '').toLowerCase();
  if (/\blearn\b|\badd\b|\bnext\s+opening\b|\bshould\s+i\s+(?:learn|study|add)\b/.test(a)) return 'learn-next';
  if (/\b(?:leave|leaving|out\s+of|off)\s+(?:the\s+|my\s+|your\s+)?(?:book|theory|prep)|\bdrift\b|\bdeviate\b/.test(a)) return 'out-of-book';
  return 'hole';
}

/**
 * buildQuestionGrounding — the SHARED grounding builder so the coach's
 * grounded-data brain fires IDENTICALLY on every talking surface (David
 * 2026-07-04: "Coach is master of its domain — one coherent unit").
 *
 * `coachService.ask` builds this inline for surfaces that route through it
 * (Learn / Play chat / standalone chat / analyse / review). Surfaces that call
 * `getCoachChatResponse` DIRECTLY — voice (`VoiceChatMic`) and the masterclass
 * course chat (`MasterclassCoachChat`) — were passing no grounding at all, so
 * NONE of the assemblers fired there (a spoken "what am I weak in?" or an
 * opening-page "what's my strongest opening?" got an ungrounded free-LLM reply).
 * They now call THIS and pass the result as the `grounding` arg, reaching the
 * exact same assemblers. Board fields are optional — board-independent intents
 * (progress / opening-profile / concept) ground with no FEN.
 */
export function buildQuestionGrounding(
  ask: string,
  liveState: {
    fen?: string;
    moveHistory?: string[];
    tactics?: import('./types').TacticsLiveContext;
    engineBestMoveUci?: string;
    evalCp?: number;
    evalMateIn?: number;
    studentColor?: 'white' | 'black';
    openingId?: string;
  } = {},
  surface: string = 'standalone-chat',
): import('../services/coachApi').MasterGroundingOptions {
  return {
    currentFen: liveState.fen,
    moveHistory: liveState.moveHistory,
    tactics: liveState.tactics,
    engineBestMoveUci: liveState.engineBestMoveUci,
    engineEvalCp: liveState.evalCp,
    engineMateIn: liveState.evalMateIn,
    studentColor: liveState.studentColor,
    openingId: liveState.openingId,
    surface: coachSurfaceToRoute(surface),
    planQuestion: isPlanQuestion(ask),
    bestMoveQuestion: isBestMoveQuestion(ask),
    tacticsQuestion: isTacticsQuestion(ask),
    progressQuestion: isProgressQuestion(ask),
    openingProfileQuestion: isOpeningProfileQuestion(ask),
    openingProfileKind: openingProfileKind(ask),
    statsQuestion: isStatsQuestion(ask),
    strengthsQuestion: isStrengthsQuestion(ask),
    openingAccuracyQuestion: isOpeningAccuracyQuestion(ask),
    openingTrapsQuestion: isOpeningTrapsQuestion(ask),
    openingTrapsSystemAsk: opensTrapsSystemAsk(ask),
    reviewDueQuestion: isReviewDueQuestion(ask),
    mistakesQuestion: isMistakesQuestion(ask),
    tacticsProfileQuestion: isTacticsProfileQuestion(ask),
    phaseQuestion: isPhaseQuestion(ask),
    repertoireGapQuestion: isRepertoireGapQuestion(ask),
    repertoireGapKind: repertoireGapKind(ask),
    masterPlayQuestion: isMasterPlayQuestion(ask),
    conceptQuestion: isConceptQuestion(ask),
    playerGamesQuestion: isPlayerGamesQuestion(ask),
    endgameQuestion: isEndgameQuestion(ask),
    positionAssessmentQuestion: isPositionAssessmentQuestion(ask),
  };
}
