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

// ── Conversational-filler normalizer (matrix pass 4, 2026-07-10) ──────────────
// Real users pad questions with greetings and hedges — "hey so um whos winning",
// "honestly what should I work on", "roughly how accurate is my play these
// days". The intent regexes match the QUESTION, not the padding, so the coach
// dropped to the stock line on filler-laden asks. We normalize the ask ONCE at
// the top of `buildQuestionGrounding` (the shared runtime path) so every
// predicate sees the de-fillered text. The set is a fixed, conservative list of
// non-content tokens — it never strips chess words, opening names, or the
// positional/temporal cues ("here", "right now", "in this position") that
// disambiguate live-board from over-time questions.
const LEADING_FILLER_RE =
  /^(?:hey|hi|hiya|yo|ok|okay|kk?|alright|alrighty|so|well|um+|uh+|erm|hmm+|look|listen|like|and|but|also|please|yeah|yep|sup|dude|man|bro|ma'?am|sir|be\s+real\s+with\s+me|real\s+quick|quick\s+(?:one|question)|tell\s+me|i\s+mean|let\s+me\s+ask|i\s+(?:wanna|want\s+to)\s+know|i\s+was\s+wondering|can\s+you\s+tell\s+me|so\s+like)\b[\s,.:;–—-]*/i;
const MID_FILLER_RE =
  /\b(?:actually|honestly|basically|literally|seriously|really|just|even|simply|roughly|currently|kinda|sorta|pretty\s+much|i\s+guess|you\s+know|these\s+days|at\s+all|or\s+what|again|then)\b/gi;

// Common misspellings of the high-frequency chess/self-knowledge nouns the
// intent regexes key on (matrix pass 6, 2026-07-10). Same philosophy as the
// opening NAME_ALIASES — a curated map, since a typo'd word breaks a regex and
// the safe default (correct but less rich) is the fallback for anything not
// mapped. Every key is a NON-word, so whole-word replacement is safe. Opening
// NAMES are handled separately by NAME_ALIASES in openingDetectionService.
const COMMON_TYPOS: Record<string, string> = {
  ratng: 'rating', raiting: 'rating', ratign: 'rating', reting: 'rating',
  accuarcy: 'accuracy', accuracey: 'accuracy', acuracy: 'accuracy', accurracy: 'accuracy',
  mistaks: 'mistakes', mistkaes: 'mistakes', mistaes: 'mistakes', misakes: 'mistakes',
  tactc: 'tactic', tactcs: 'tactics', tatic: 'tactic', tatics: 'tactics', tactis: 'tactics',
  improvng: 'improving', imrpoving: 'improving', improveing: 'improving',
  winnig: 'winning', winnin: 'winning', wining: 'winning',
  weaknes: 'weakness', weeknes: 'weakness', weaknesss: 'weakness',
  endgam: 'endgame', endgme: 'endgame', engame: 'endgame',
  openning: 'opening', opeing: 'opening', openin: 'opening',
  blundr: 'blunder', blunderr: 'blunder', blnder: 'blunder',
  strenght: 'strength', strentgh: 'strength', strenghts: 'strengths',
  positon: 'position', posistion: 'position', poisiton: 'position',
};
const TYPO_RE = new RegExp(`\\b(${Object.keys(COMMON_TYPOS).join('|')})\\b`, 'gi');

/** Strip leading greetings/hedges + a fixed set of mid-sentence filler words,
 *  and correct common misspellings, so the intent predicates match a padded /
 *  typo'd question. Never returns empty (falls back to the original ask) and
 *  never touches disambiguating cue words or opening names. */
export function stripQuestionFiller(ask: string | undefined): string {
  if (!ask) return ask ?? '';
  let s = ask;
  let prev: string;
  do {
    prev = s;
    s = s.replace(LEADING_FILLER_RE, '');
  } while (s !== prev && s.length > 0);
  s = s
    .replace(MID_FILLER_RE, ' ')
    .replace(TYPO_RE, (m) => COMMON_TYPOS[m.toLowerCase()] ?? m)
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([?.!,])/g, '$1')
    .trim();
  return s.length > 0 ? s : ask;
}

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
  String.raw`\bwhat\s+am\s+i\s+doing\s+(?:here|in\s+this)\b`,
  String.raw`\boutline\s+(?:a|my|the)?\s*(?:plan|strategy)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:goal|objective|aim)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:my|the)\s+(?:setup|structure|formation|pawn\s+structure)\b`,
  String.raw`\bwhere\s+(?:do|should)\s+(?:my\s+)?(?:pieces?|knights?|bishops?|rooks?|queen|king)\s+(?:go|belong|head)\b`,
  String.raw`\bhow\s+do\s+i\s+(?:make\s+progress|build\s+up|improve\s+my\s+position|attack|defend|press|convert\s+my\s+edge)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:right|correct|best)\s+(?:plan|setup|approach|way\s+to\s+play)\b`,
  String.raw`\bwhat\s+am\s+i\s+(?:supposed|meant)\s+to\s+do\b`,
  String.raw`\blong[-\s]?(?:range|haul)\b`,
  String.raw`\bwhat\s+should\s+i\s+be\s+(?:aiming|going|gunning|pushing|playing)\s+for\b`,
  String.raw`\bwhat\s+am\s+i\s+(?:aiming|going|gunning|pushing|playing)\s+for\b`,
]);
export function isPlanQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // A "training / study / practice plan" is a study-recommendation, NOT a board
  // plan — the bare "plan" trigger would misroute it to the live position plan
  // (matrix pass 8, 2026-07-10). Defer to the progress/training verticals.
  if (/\b(?:training|study|practi[cs]e|improvement|learning|lesson)\s+plan\b|\bplan\s+(?:my|out\s+my)\s+(?:training|study|studying|practi[cs]e|improvement|learning)\b/i.test(ask)) return false;
  return PLAN_QUESTION_RE.test(ask);
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
  String.raw`\bwhat\s+should\s+i\s+be\s+(?:playing|doing)\b`,
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
  // move-consequence hypothetical — "what happens if I play e5", "if I take"
  String.raw`\bwhat\s+happens\s+if\s+i\s+(?:play|go|take|push|capture|castle|move)\b`,
  // "which piece should I develop / move" — a development move decision.
  String.raw`\bwhich\s+piece\s+should\s+i\s+(?:develop|move|play|bring\s+out)\b`,
  String.raw`\bwhat\s+move\s+should\s+i\s+(?:make|play|pick|choose|go\s+(?:for|with))\b`,
  String.raw`\bwhat\s+would\s+(?:the\s+)?(?:engine|computer|stockfish|a\s+gm|a\s+master)\s+(?:play|do|pick|choose|go\s+for|recommend)\b`,
  String.raw`\b(?:give|show)\s+me\s+(?:the\s+)?(?:strongest|best|top)\s+(?:continuation|move|line|option)\b`,
  String.raw`\bbest\s+here\b`,
  String.raw`^\s*best\s*\??\s*$`,   // bare terse "best?" / "best"
]);
export function isBestMoveQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // "my best OPENING / defence / repertoire" is an opening-profile question, not
  // a board best-MOVE — the bare "best" trigger would misroute it (matrix pass
  // 9, 2026-07-10). ("best line/move here" stays a board question.)
  if (/\bbest\s+(?:opening|defen[cs]e|repertoire|system)\b/i.test(ask)) return false;
  // "best way to use / learn this app" is an app-help question, not a move.
  if (/\bbest\s+way\s+to\s+(?:use|learn|study|navigate|improve)\b/i.test(ask)) return false;
  return BEST_MOVE_QUESTION_RE.test(ask);
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
  String.raw`\bthreaten(?:ing|ed|s)?\b`,
  String.raw`\b(?:get(?:ting)?\s+|be\s+|about\s+to\s+(?:get\s+)?)?mated\b`,
  String.raw`\bworried\s+about\s+my\s+king\b`,
  String.raw`\bis\s+my\s+king\s+(?:in\s+danger|under\s+attack|exposed|weak|vulnerable)\b`,
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
  String.raw`\bcombinations?\b`,
  String.raw`\b(?:any\s+)?(?:shots?|sac(?:rifice)?s?|tricks?|tactics?)\s+(?:here|available|on|in\s+this)?\b`,
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
  String.raw`\b(?:anything|something)\s+tactical\b`,
]);
export function isTacticsQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // A tactics-PROFILE ask ("what's my weakest tactic", "how are my tactics")
  // is about the student over time — the bare `\btactics?\b` pattern below
  // would otherwise misroute it to the live-board scan (live prod 2026-07-09).
  // `isTacticsProfileQuestion` is a hoisted declaration, so this precedence
  // guard is safe despite the definition order.
  if (isTacticsProfileQuestion(ask)) return false;
  // "teach me forks / drill me on back-rank mates / quiz me on pins" is a
  // LEARNING request (concept or training), NOT a live-board scan — the tactic
  // NOUN would otherwise misroute it to "is there a fork HERE" (matrix pass 8).
  if (/\b(?:teach|drill|quiz|test|show)\s+me\b/i.test(ask)) return false;
  return TACTICS_QUESTION_RE.test(ask);
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
  String.raw`\b(?:am\s+i|are\s+we)\s+(?:better|worse|winning|losing|ahead|behind|equal|fine|ok(?:ay)?|in\s+trouble|in\s+good\s+shape|busted|lost|dead|cooked|toast|done\s+for)\b`,
  String.raw`\bplus\s+or\s+minus\b`,
  String.raw`\b(?:am\s+i\s+)?winning\s+or\s+losing\b`,
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
  // resign / play-on decision = an assessment of how lost I am (pass 8).
  String.raw`\bshould\s+i\s+resign\b`,
  String.raw`\bis\s+it\s+worth\s+(?:playing\s+on|continuing|fighting\s+on|carrying\s+on)\b`,
  String.raw`\bis\s+(?:this|it|the\s+position)\s+(?:resignable|hopeless|salvageable)\b`,
  // piece-quality / pawn-structure positional judgment.
  String.raw`\bis\s+my\s+(?:bishop|knight|rook|queen|king|pawn|pieces?|structure|position)\s+(?:bad|good|active|passive|strong|weak|misplaced|awkward|fine|ok(?:ay)?)\b`,
  String.raw`\b(?:do\s+i\s+have\s+(?:any\s+)?)?weak\s+(?:pawns?|squares?)\b`,
  String.raw`\b(?:how(?:'?s| is)\s+)?my\s+pawn\s+structure\b`,
  // win-probability / outcome = a read of the eval (pass 9).
  String.raw`\b(?:what\s+are\s+)?my\s+(?:winning\s+)?chances\b`,
  String.raw`\bwill\s+i\s+win\s+(?:this|here|from\s+here)\b`,
  String.raw`\bhow\s+likely\s+am\s+i\s+to\s+(?:win|lose|draw|hold)\b`,
  String.raw`\bwinning\s+chances\b`,
  // square / file positional judgment on the live board.
  String.raw`\bis\s+[a-h][1-8]\s+(?:weak|strong|weakened|hanging|a\s+(?:weak|strong)\s+square|defended|covered|contested)\b`,
  String.raw`\b(?:is\s+)?(?:the\s+)?[a-h][\s-]?file\s+(?:open|closed|weak|mine|contested|half[\s-]?open)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+going\s+on\s+with\s+the\s+[a-h][\s-]?file\b`,
]);
export function isPositionAssessmentQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // "am I better AT tactics / in the endgame" is a SKILL/phase comparison about
  // the student over time, NOT a board assessment ("am I better HERE"). The bare
  // "am I better" trigger would otherwise misroute it to the live position eval
  // (matrix pass 7, 2026-07-10). Defer to the skill/phase/converting verticals.
  if (/\b(?:better|worse|stronger|weaker|good|bad)\s+(?:at|in)\s+(?:tactics|endgames?|openings?|middlegames?|calculation|converting|defen[cs]e|attack)/i.test(ask)) return false;
  // "am I better THAN I was last month / before" is an over-time TREND, not a
  // board assessment (matrix pass 9). Defer to the trend vertical.
  if (/\b(?:better|worse|stronger|weaker)\s+than\s+(?:i\s+(?:was|used\s+to)|last\s+(?:month|week|year)|before|a\s+\w+\s+ago|i\s+used)/i.test(ask)) return false;
  return POSITION_ASSESSMENT_RE.test(ask);
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
  String.raw`\bwhat\s+(?:the\s+)?(?:best|elite|top|strong|titled|good)\s+players?\s+(?:play|do|prefer|choose|go\s+for)\b`,
  String.raw`\bbest\s+by\s+test\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:engine|database)\s+(?:top|favou?rite)\b`,
  String.raw`\b(?:played|done|preferred|chosen|handled|met|answered|treated)\s+at\s+(?:the\s+)?(?:top|elite|gm|master|highest)\s+level\b`,
  String.raw`\bwhat(?:'?s| is)?\s+book\b`,
  String.raw`\bat\s+(?:the\s+)?(?:top|elite|gm|master|highest)\s+level\b`,
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
  String.raw`\b(?:what(?:'?s| is)?\s+the\s+)?(?:winning\s+)?technique\s+to\s+(?:convert|win|hold|draw|promote)\b`,
  String.raw`\bhow\s+do\s+i\s+(?:not\s+lose|avoid\s+losing)\s+(?:this|the)\s+(?:ending|endgame)\b`,
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
  String.raw`\bhow\s+did\s+(?:he|she|they|the\s+(?:pro|master|player|gm)|\w+)\s+(?:win|handle|beat|play|do)\b`,
  // "show/find me a game where/of/in <player> …" — a game-lookup, not "his games"
  String.raw`\b(?:show|find|got|see|pull\s+up|get)\s+(?:me\s+)?(?:a\s+|one\s+|any\s+)?games?\s+(?:where|of|from|in\s+which|with|that)\b`,
  // "do you have / is there a game in/for this opening/line"
  String.raw`\b(?:do\s+you\s+have|is\s+there|got|have\s+you\s+got)\s+(?:a\s+|any\s+)?games?\s+(?:in|with|for|from|of|here)\b`,
  // "what game shows/demonstrates this idea"
  String.raw`\bwhat\s+games?\s+(?:shows?|demonstrates?|illustrates?|has|features?)\b`,
  // "show me a hikaru game (in this line)" — a NAMED player's game, the name
  // sitting between the article and "game" (matrix pass 9, 2026-07-10).
  String.raw`\b(?:show|find|pull\s+up|get|see)\s+(?:me\s+)?(?:a|an|one|any)\s+\w+(?:'s)?\s+games?\b`,
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
  // "teach me forks" (no "about") — a named tactic/strategy CONCEPT, so it
  // routes to the book-grounded definition, not the live-board scan (pass 8).
  String.raw`\bteach\s+me\s+(?:a\s+|an\s+|the\s+)?(?:fork|pin|skewer|zwischenzug|outpost|zugzwang|back[\s-]?rank|discovered|deflection|decoy|overload|interference|windmill|battery|fianchetto|prophylaxis|tempo|opposition|triangulation|en\s*passant|combination|sacrifice)\w*\b`,
  String.raw`\bhow\s+do\s+\w+s\s+work\b`,   // "how do pins work"
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
const IMPROVE_VERBS = String.raw`(?:work\s+(?:on|at|through)|improve(?:\s+on)?|practi[sc]e|drill|focus\s+on|get\s+(?:better|good|sharper)(?:\s+at)?|fix|address|sharpen|hone|strengthen|grind|polish|refine|prioriti[sz]e|brush\s+up(?:\s+on)?|shore\s+up|bone\s+up(?:\s+on)?|read\s+up(?:\s+on)?|level\s+up|tighten\s+up|iron\s+out|build\s+up|dial\s+in|plug|patch\s+up|clean\s+up|firm\s+up|beef\s+up)`;
const REC_VERBS = String.raw`(?:train|learn|study|master|develop|review|prep(?:are)?)`;
const ANY_TRAIN_VERB = String.raw`(?:` + IMPROVE_VERBS + String.raw`|` + REC_VERBS + String.raw`)`;
const WEAKNESS_NOUNS = String.raw`(?:weakness(?:es)?|weak\s+(?:spots?|points?|areas?|aspects?|parts?|sides?|links?|zones?)|weakest\s+(?:spot|point|area|aspect|part|skill|move|link|element|side|phase|stage)|flaws?|shortcomings?|deficienc(?:y|ies)|deficits?|blind\s+spots?|achilles(?:'?s)?\s+heel|leaks?|holes?|gaps?|sticking\s+points?|bad\s+habits?|recurring\s+(?:mistakes?|errors?|patterns?)|common\s+(?:mistakes?|errors?)|repeated\s+(?:mistakes?|errors?)|kryptonite|downfall|undoing|soft\s+spots?|nemesis|bugbear|b[eê]te\s+noire|stumbling\s+blocks?|trouble\s+(?:spots?|areas?)|problem\s+areas?|pain\s+points?|failings?|limitations?|vulnerabilit(?:y|ies))`;
// weak / poor / struggle predicates (with in/at/on/with prepositions)
const WEAK_PRED = String.raw`(?:weak(?:est)?|bad|worst|poor|terrible|awful|horrible|hopeless|useless|rubbish|crap(?:py)?|garbage|trash|shaky|rough|suck(?:s|y)?|stink(?:s|y)?|not\s+(?:good|great))`;
const PROGRESS_QUESTION_RE = anyOf([
  // ── "am I improving / how am I doing" (progress-over-time) ──
  String.raw`\bam\s+i\s+(?:improving|getting\s+(?:better|worse)|progressing|developing|growing|any\s+good|good\s+enough|getting\s+anywhere)\b`,
  // "am I actually/really/even getting (any) better" — an adverb between "am i"
  // and "getting" broke the tight pattern above (matrix pass 2, 2026-07-10).
  String.raw`\bam\s+i\s+(?:actually|really|even|genuinely|at\s+all)\s+getting\s+(?:any\s+)?(?:better|worse)\b`,
  // "what bad / recurring patterns (keep showing up / do I make)" — a habit ask.
  String.raw`\bwhat\s+(?:bad|recurring|repeated|common)\s+patterns?\b`,
  // "how has my play/game been (lately/recently)" — a progress-over-time ask.
  String.raw`\bhow\s+(?:has|have)\s+my\s+(?:play|game|chess|form|results?)\s+been\b`,
  String.raw`\bhow\s+am\s+i\s+(?:doing|progressing|playing|improving|developing|getting\s+on)\b`,
  String.raw`\bhow(?:'?s| is| has)\s+my\s+(?:game|play|chess|progress|improvement)\b`,
  String.raw`\bhow\s+(?:can|do|should|could|might)\s+i\s+(?:get\s+better|improve|progress|level\s+up|get\s+good)\b`,
  String.raw`\b(?:fastest|quickest|best|surest)\s+way\s+(?:for\s+me\s+)?to\s+improve\b`,
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
  String.raw`\b(?:give|suggest|recommend)\s+(?:me\s+)?(?:something|a\s+plan|a\s+focus|an?\s+area|what|(?:\d+\s+|a\s+few\s+|some\s+|three\s+|two\s+)?(?:things|areas|stuff|pointers|tips))\s+to\s+(?:` + ANY_TRAIN_VERB + String.raw`|drill|practi[sc]e)\b`,
  // rating-goal improvement — "how do I get to 2000", "what will get me to 1800"
  String.raw`\bhow\s+do\s+i\s+(?:get|climb|rise|reach|hit|make\s+it)\s+to\s+\d{3,4}\b`,
  String.raw`\bwhat\s+(?:will|would|do\s+i\s+need\s+to)\s+(?:get\s+me\s+to|reach|hit)\s+\d{3,4}\b`,
  String.raw`\bto\s+(?:get|reach|climb)\s+to\s+\d{3,4}\b`,
  // ── focus / priority ──
  String.raw`\b(?:where|what)\s+should\s+(?:i\s+focus|my\s+focus\s+be|i\s+(?:put|spend)\s+my\s+(?:time|energy|effort))\b`,
  String.raw`\bwhat\s+(?:area|part|phase|aspect|skill)\s+(?:of\s+my\s+(?:game|play|chess)\s+)?needs?\s+(?:the\s+most\s+)?(?:work|attention|improvement)\b`,
  String.raw`\bwhat\s+needs?\s+(?:the\s+most\s+)?(?:work|improvement|attention)\b`,
  String.raw`\b(?:study|training|practice)\s+plan\b`,
  String.raw`\bplan\s+(?:out\s+)?my\s+(?:training|study|studying|practi[cs]e|improvement)\b`,
  // ── weakness NOUNS ──
  String.raw`\b(?:my|the)\s+(?:biggest\s+|main\s+|worst\s+|greatest\s+|number\s+one\s+|top\s+)?(?:\d+\s+)?` + WEAKNESS_NOUNS + String.raw`\b`,
  // "list my top 3 weaknesses" / "top 5 weak spots"
  String.raw`\b(?:list|show|name|give\s+me)\s+(?:my\s+|the\s+)?(?:top\s+)?(?:\d+\s+)?` + WEAKNESS_NOUNS + String.raw`\b`,
  // "things/areas holding me back" — standalone (not just "what's holding me")
  String.raw`\b(?:holding|keeping|dragging)\s+me\s+(?:back|down)\b`,
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
  String.raw`\bwhere\s+(?:am\s+i|i'?m|do\s+i)\s+(?:the\s+)?(?:` + WEAK_PRED + String.raw`|struggl(?:e|ing)|los(?:e|ing)|failing|need\s+work|go(?:ing)?\s+wrong|mess(?:ing)?\s+up|blunder(?:ing)?|fall(?:ing)?\s+short|drop(?:ping)?\s+(?:points?|games?)|leak(?:ing)?\s+(?:points?|rating|elo))\b`,
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
  // "what parts/areas of my game are weak" — a plural-parts weakness diagnosis.
  String.raw`\bwhat\s+(?:parts?|areas?|aspects?|bits?|elements?)\s+of\s+my\s+(?:game|play|chess)\s+(?:are|is)\s+(?:` + WEAK_PRED + String.raw`|lacking|off|shaky)\b`,
]);
export function isProgressQuestion(ask: string | undefined): boolean {
  return !!ask && PROGRESS_QUESTION_RE.test(ask);
}

/** An IMPROVEMENT-TREND question — "am I improving?", "am I getting better /
 *  worse?", "is my accuracy trending up?", "have I improved lately?". Distinct
 *  from isProgressQuestion (which dumps CURRENT weaknesses): a trend question
 *  wants the DIRECTION of the student's play OVER TIME, answered from
 *  phaseStrengthOverTime. Routed BEFORE progress in the chokepoint so "am I
 *  improving" stops getting a weakness list it didn't ask for (David 2026-07-04
 *  misroute fix). Scoped tight to temporal-improvement wording so it never
 *  hijacks a "what should I work on" recommendation. */
const IMPROVEMENT_TREND_RE = anyOf([
  String.raw`\bam\s+i\s+(?:improving|getting\s+(?:any\s+)?(?:better|worse|stronger|weaker|sharper)|progressing|declining|regressing|plateau(?:ing|ed)?|stagnating|going\s+backwards?|trending\s+(?:up|down))\b`,
  // "have I made (any) progress (lately/recently)" — a temporal-progress ask.
  String.raw`\bhave\s+i\s+(?:made\s+(?:any\s+)?progress|come\s+(?:any\s+)?(?:far|way)|gotten?\s+(?:any\s+)?(?:better|stronger))\b`,
  // "getting stronger/better over time" (not just "am I …") — trajectory wording.
  String.raw`\b(?:getting|growing)\s+(?:any\s+)?(?:better|stronger|sharper|worse|weaker)\s+(?:over\s+time|lately|recently|these\s+days)\b`,
  String.raw`\b(?:have|did)\s+i\s+(?:improv(?:e|ed)|gotten?\s+(?:better|worse)|progress(?:ed)?|declin(?:e|ed)|regress(?:ed)?)\b`,
  String.raw`\bis\s+my\s+(?:game|play|chess|accuracy|rating|elo|improvement|progress)\s+(?:improving|getting\s+(?:better|worse)|going\s+(?:up|down)|trending\s+(?:up|down)|climbing|rising|falling|declining|stagnant|stalling|plateau(?:ing|ed)?)\b`,
  String.raw`\bhow\s+(?:am|have)\s+i\s+(?:trending|improv(?:ing|ed)|progress(?:ing|ed)|develop(?:ing|ed))\s*(?:over\s+time|lately|recently)?\b`,
  String.raw`\bhow(?:'?s| is| has)\s+my\s+(?:improvement|progress|trajectory)\s+(?:been|going|trending|looking|coming\s+along)\b`,
  String.raw`\bam\s+i\s+(?:better|worse)\s+than\s+(?:i\s+(?:was|used\s+to\s+be)|last\s+(?:month|week)|before|a\s+(?:month|while)\s+ago)\b`,
  String.raw`\b(?:my\s+)?(?:improvement|progress)\s+(?:over\s+time|trend|trajectory)\b`,
  String.raw`\bam\s+i\s+(?:making\s+progress|moving\s+(?:up|forward)|headed\s+(?:up|in\s+the\s+right\s+direction))\b`,
  String.raw`\btrending\s+up\s+or\s+down\b`,
  String.raw`\bhow\s+many\s+(?:rating\s+)?points?\s+(?:did\s+i|have\s+i)\s+(?:gain|gained|lose|lost|drop|dropped|pick\s+up)\b`,
  String.raw`\b(?:rating\s+)?points?\s+(?:gained|lost|dropped)\s+(?:this\s+(?:week|month)|lately|recently)\b`,
]);
export function isImprovementTrendQuestion(ask: string | undefined): boolean {
  return !!ask && IMPROVEMENT_TREND_RE.test(ask);
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
  String.raw`\bwhich\s+opening\s+is\s+my\s+(?:absolute\s+|single\s+|overall\s+|clear\s+)?(?:strongest|best|weakest|worst|favou?rite|go[\s-]?to)\b`,
  String.raw`\b(?:my\s+)?bread\s+and\s+butter(?:\s+opening)?\b`,
  String.raw`\bwhat\s+do\s+i\s+open\s+with\b`,
  // "which opening do I score/perform/win best/most in?" — a WHICH-opening ask
  // grounded in the student's per-opening results.
  String.raw`\bwhich\s+opening\s+(?:do\s+i\s+(?:score|perform|win|do)|scores?|performs?|wins?\s+me)\b`,
  // "which of my openings performs/scores best/worst"
  String.raw`\bwhich\s+of\s+my\s+openings?\b`,
  // "what opening should I play?" (a repertoire recommendation, not a board move)
  String.raw`\bwhat\s+opening\s+should\s+i\s+play\b`,
  // "what opening should I stop playing / drop / ditch" — the weakest-opening ask.
  String.raw`\bwhat\s+opening\s+should\s+i\s+(?:stop\s+playing|drop|ditch|abandon|give\s+up|quit)\b`,
  // "which of my openings is letting me down / underperforming" — weakest ask.
  String.raw`\bwhich\s+of\s+my\s+openings?\s+is\s+(?:letting\s+me\s+down|underperforming|dragging\s+me\s+down|failing\s+me)\b`,
  // "which opening do I score best/worst with"
  String.raw`\bwhich\s+opening\s+do\s+i\s+score\s+(?:best|worst)\s+with\b`,
  // "most successful/effective opening" (adds to the strongest/best set above)
  String.raw`\bmy\s+most\s+(?:successful|effective|winning)\s+(?:opening|line|defen[cs]e)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+most\s+(?:successful|effective|winning)\s+opening\b`,
]);
export function isOpeningProfileQuestion(ask: string | undefined): boolean {
  return !!ask && OPENING_PROFILE_RE.test(ask);
}
/** Which slice of the opening profile the question asks for. */
export function openingProfileKind(ask: string | undefined): 'strongest' | 'favorite' | 'weakest' {
  const a = (ask ?? '').toLowerCase();
  if (/\b(?:weakest|worst|stop\s+playing|drop|ditch|abandon|give\s+up|quit|letting\s+me\s+down|underperforming|failing\s+me)\b/.test(a)) return 'weakest';
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
  String.raw`\bwhat\s+am\s+i\s+rated\b`,                             // "what am I rated"
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:exact|current|precise|actual|real)\s+rating\b`,
  String.raw`\bwin\s*[\/-]\s*loss\b|\bwin[\s-]loss\b`,               // "win/loss", "win-loss"
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:level|track\s+record)\b`,
  String.raw`\bhow\s+strong\s+(?:a\s+player\s+)?am\s+i\b`,
  String.raw`\bdo\s+i\s+win\s+more\s+than\s+i\s+lose\b`,
  String.raw`\bam\s+i\s+any\s+good\b`,
  String.raw`\bwhat(?:'?s| is| are)?\s+my\s+(?:win[\s-]?rate|record|score|w[\s\/-]l|stats?|statistics|numbers)\b`,
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
  // temporal-window stats — "how have I done this week", "my last 10 games"
  String.raw`\bhow\s+(?:have|did|am|are)\s+i\s+(?:done|doing|do)\s+(?:this\s+(?:week|month)|lately|recently|today|so\s+far)\b`,
  String.raw`\bhow\s+(?:are|were|have)\s+(?:my\s+)?(?:last|recent|past)\s+\d+\s+games\b`,
  String.raw`\bmy\s+(?:last|recent|past)\s+\d+\s+games\b`,
  String.raw`^\s*(?:my\s+)?rating\s*\??\s*$`,   // bare terse "rating?" / "my rating"
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
  String.raw`\bwhere\s+do\s+i\s+play\s+(?:well|my\s+best|best|strongest)\b`,
  String.raw`\bwhat\s+do\s+i\s+do\s+best\s+(?:over\s+the\s+board|otb|in\s+my\s+games)\b`,
  String.raw`\bmy\s+best\s+skills?\b`,
  String.raw`\bwhat\s+are\s+my\s+strong\s+points?\b`,
  String.raw`\b(?:tell|show)\s+me\s+what\s+i(?:'?m| am)\s+good\s+at\b`,
  String.raw`\bmy\s+best\s+(?:areas?|skills?|parts?)\b`,
  String.raw`\bwhat\s+am\s+i\s+great\s+at\b`,
  // double-negation — "what am I NOT weak/bad at" = a strength.
  String.raw`\bwhat\s+am\s+i\s+not\s+(?:weak|bad|terrible|poor|awful)\s+(?:at|in)\b`,
  // "where am I strong/strongest" (parallel to "where do I excel")
  String.raw`\bwhere\s+(?:am\s+i|do\s+i\s+feel)\s+(?:the\s+)?(?:strong|strongest|solid|confident)\b`,
  // "what part/area of my game is best/strongest/good"
  String.raw`\bwhat\s+(?:part|area|aspect|bit|element)\s+of\s+my\s+(?:game|play|chess)\s+is\s+(?:best|strongest|good|strong|my\s+best)\b`,
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
  // OPENING-scoped accuracy only: "how accurately do I PLAY/KNOW …" (an opening
  // is the object). A BARE "how accurate am I" / "what's my accuracy" has NO
  // opening object and is an OVERALL-accuracy question (isAccuracyQuestion) —
  // matching it here made opening-accuracy hijack it, since it runs first in the
  // chokepoint (David 2026-07-05 visual audit: "how accurate am I overall?" got
  // the drill-a-line answer). The anchored "accuracy … opening/line/theory"
  // alternatives below still catch "how accurate am I in my opening".
  // "how accurately do I play/know THE <opening>" — REQUIRES an object after the
  // verb, so a BARE "how accurately do I play" (no opening) falls to overall
  // accuracy (isAccuracyQuestion) instead of hijacking to opening-accuracy.
  String.raw`\bhow\s+accura(?:te|tely)\s+(?:do|did|can|have)\s+i\s+(?:play|know|handle|remember|drill)\s+(?:the|my|an?)\s+(?!game\b|move\b|moves\b|position\b|opening\s+move)[a-z][\w'-]+`,
  // "how well/deeply do I know/play THE <opening name>" (a named opening, not "the game")
  String.raw`\bhow\s+(?:well|deeply|sharply|solidly|thoroughly|good)\s+do\s+i\s+(?:know|play|handle|drill)\s+(?:the|my)\s+(?!game\b|position\b|board\b|rules\b|move\b)[a-z][\w'-]+`,
  // "where do I go wrong / slip / mess up IN THE <opening name>" — a mistake
  // scoped to a named opening (NOT a phase word — those route to isPhaseQuestion).
  String.raw`\bwhere\s+do\s+i\s+(?:go\s+wrong|slip(?:\s+up)?|struggle|mess\s+up|blunder|come\s+unstuck)\s+(?:in|with|against)\s+(?:the|my)\s+(?!opening\b|game\b|middlegame\b|middle\s?game\b|endgame\b|end\s?game\b|position\b|middle\b|end\b|long\b)[a-z][\w'-]+`,
  // "which variation / line / sub-line OF (the) <opening> do I …"
  String.raw`\bwhich\s+(?:variation|line|sub[\s-]?line)\s+of\s+(?:the\s+)?[a-z][\w'-]+\s+do\s+i\b`,
  // Named-opening accuracy: "accuracy … in/with/against/playing THE <opening>"
  // ("what's my accuracy in the Caro-Kann", "how accurate am I in the
  // Sicilian"). Requires the preposition + an article (the/my/a) so a BARE or
  // OVERALL ask ("how accurate am I overall", "my accuracy in general") does NOT
  // match — the article gate excludes "in general/overall" (no article) and the
  // lookahead excludes "the game(s)/overall".
  String.raw`\baccura(?:te|cy)\b[^?.!]{0,25}\b(?:in|with|against|playing|into|versus|vs\.?)\s+(?:the|my|an?)\s+(?!general\b|overall\b|games?\b|life\b)[a-z][\w'-]+`,
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
  // NAMED-opening accuracy WITHOUT an anchor word ("how good is my Sicilian?",
  // "how clean is my Caro-Kann play?") — the token after "my" is an opening
  // NAME, not a stat/phase noun. The negative lookahead excludes the stat/phase
  // nouns so this never hijacks "how good is my rating/endgame/game" (those own
  // their verticals). The dispatch resolves the name; a non-opening → safe
  // default (matrix pass 2, 2026-07-10).
  String.raw`\bhow\s+(?:good|clean|sharp|solid|strong|accurate|deep)\s+is\s+my\s+(?!rating\b|record\b|accuracy\b|game\b|play\b|chess\b|form\b|tactics?\b|endgame\b|middlegame\b|middle\s?game\b|opening\b|puzzle\b|win\b|skill)[a-z][\w'-]+`,
  // "do I play the <opening> accurately/well/cleanly" — a named opening object.
  String.raw`\bdo\s+i\s+play\s+the\s+[a-z][\w'-]+\s+(?:accurately|well|cleanly|precisely|sharply|solidly)\b`,
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
  String.raw`\bwhat\s+to\s+(?:watch|look)\s+(?:out\s+)?for\b`,
  // "any tricks in/for the <opening>" — the trick side scoped to an opening.
  String.raw`\b(?:any\s+)?tricks?\s+(?:in|for|against|with)\s+(?:the|my|this)\b`,
  String.raw`\bwhat\s+(?:should\s+i|do\s+i\s+need\s+to)\s+(?:watch|look)\s+(?:out\s+)?for\b`,
  String.raw`\bwhat\s+(?:are\s+the\s+)?(?:common\s+)?(?:pitfalls?|traps?)\s+(?:in|of|to\s+avoid)\b`,
  String.raw`\b(?:pitfalls?|traps?)\s+(?:should\s+i\s+|to\s+)?avoid\b`,
  String.raw`\bwhat\s+(?:pitfalls?|traps?)\s+should\s+i\s+(?:avoid|know|watch)\b`,
  String.raw`\b(?:tricks?|traps?)\s+(?:in|for)\s+my\s+(?:openings?|repertoire)\b`,
  String.raw`\bwhat\s+tricks?\s+(?:can\s+i\s+play|are\s+there|do\s+i\s+have|should\s+i\s+know|exist)\b`,
  String.raw`\bhow\s+do\s+i\s+trap\s+(?:my\s+)?opponent\b`,
  // "how do I get tricked/trapped/caught" — the anti-trap (what to watch for).
  String.raw`\bhow\s+(?:do|can|could|might)\s+i\s+get\s+(?:tricked|trapped|caught|fooled|swindled)\b`,
  // "(any) traps in/for the <opening>" — a trap ask scoped to a named opening.
  String.raw`\b(?:any\s+)?traps?\s+(?:in|for|against|with)\s+(?:the|my|this)\b`,
  // "what tricks/traps can I fall for / walk into" — the anti-trap side.
  String.raw`\b(?:tricks?|traps?)\s+(?:can|could|do|might)\s+i\s+(?:fall\s+for|walk\s+into|miss|blunder\s+into|get\s+caught\s+(?:in|by))\b`,
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
  // "what reviews are due", "any reviews due", "reviews due yet" (coverage
  // harness 2026-07-09 — natural phrasing the card/rep patterns missed).
  String.raw`\breviews?\s+(?:are\s+)?due\b`,
  String.raw`\bdo\s+i\s+have\s+(?:any\s+)?reviews?\b`,
  String.raw`\bany\s+reviews?\b`,
  String.raw`\banything\s+to\s+(?:review|study|do)\b`,
  String.raw`\bis\s+there\s+anything\s+to\s+(?:review|study)\b`,
  String.raw`\bshould\s+i\s+do\s+my\s+(?:reps|reviews?|cards|flash\s?cards)\b`,
  String.raw`\bdo\s+i\s+need\s+to\s+(?:do|review)\s+(?:my\s+)?(?:reps|reviews?|cards|flash\s?cards)\b`,
  String.raw`\bhow\s+many\s+flash\s?cards?\s+(?:are\s+)?(?:waiting|due|left|to\s+do)\b`,
  String.raw`\bhow\s+much\s+review\b`,
  String.raw`\b(?:are\s+)?my\s+flash\s?cards?\s+(?:ready|due)\b`,
  String.raw`\bon\s+my\s+plate\b[^?.!]{0,20}\breview\b`,
  // "what cards/reps/reviews should I (do/review)"
  String.raw`\bwhat\s+(?:cards?|reps?|reviews?)\s+should\s+i\s+(?:do|review|study)\b`,
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
  // "what mistakes/errors show up / come up / recur (most)"
  String.raw`\bwhat\s+(?:mistakes?|blunders?|errors?)\s+(?:show\s+up|come\s+up|crop\s+up|appear|happen|recur|repeat)\b`,
  // "what do I (keep) get(ting) wrong"
  String.raw`\bwhat\s+do\s+i\s+(?:keep\s+)?(?:getting|get)\s+wrong\b`,
  // "what dumb/silly/careless mistakes do I keep repeating" — an adjective
  // between "what" and the mistake noun (matrix pass 4, 2026-07-10).
  String.raw`\bwhat\s+\w+\s+(?:mistakes?|blunders?|errors?)\s+do\s+i\b`,
  String.raw`\b(?:mistakes?|blunders?|errors?)\s+do\s+i\s+keep\s+(?:making|repeating|committing)\b`,
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
  String.raw`\bwhat(?:'?s| is)?\s+my\s+tactical\s+(?:awareness|accuracy|rate|rating|profile|level|weakness(?:es)?)\b`,
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
  // "what is my weakest/worst tactic", "which motif am I worst at" — a PROFILE
  // ask about the student over time, not the live board (live prod, David
  // 2026-07-09: "What is my weakest tactic?" was misrouting to the board scan).
  String.raw`\bwhat(?:'?s| is| are)?\s+my\s+(?:weakest|worst|biggest|poorest)\s+(?:tactic|motif|pattern|theme|combination)s?\b`,
  String.raw`\bwhich\s+(?:tactic|motif|pattern|theme)s?\s+(?:am\s+i\s+(?:weakest|worst)|do\s+i\s+(?:miss|struggle|fail|overlook))\b`,
  String.raw`\bwhat\s+(?:tactic|motif|pattern|theme)s?\s+(?:am\s+i\s+(?:weakest|worst)|do\s+i\s+(?:struggle|fail)\s+(?:with|at))\b`,
  // "which tactical motif/pattern do I struggle with" — an adjective ("tactical")
  // before the motif noun broke the tighter patterns above (matrix pass 2).
  String.raw`\bwhich\s+tactical\s+(?:motif|pattern|theme|tactic|idea)s?\b`,
  String.raw`\b(?:weakest|worst|poorest)\s+tactical\s+(?:motif|pattern|theme|tactic|idea)s?\b`,
  String.raw`\bwhat\s+tactics?\s+(?:should|do|can)\s+i\s+(?:drill|practi[sc]e|work\s+on|train)\b`,
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
  String.raw`\bwhat\s+(?:part|stage|phase)\s+of\s+the\s+game\s+(?:am\s+i|do\s+i)\b`,
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
  String.raw`\b(?:handle|play|do\s+in|at)\s+(?:the\s+)?critical\s+moments?\b`,
  // "is my middlegame the problem / my weak spot" — a phase-diagnosis ask that
  // names the problem noun rather than a good/bad adjective (matrix pass 2).
  String.raw`\bis\s+(?:my|the)\s+(?:opening|middlegame|middle\s?game|endgame|end\s?game)\s+(?:my\s+)?(?:the\s+)?(?:problem|issue|weakness|weak\s+spot|holding\s+me\s+back|letting\s+me\s+down)\b`,
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
  String.raw`\b(?:hole|holes|gap|gaps|weak\s+spot)s?\s+(?:are\s+|is\s+)?(?:in|of)\s+my\s+(?:opening\s+)?(?:repertoire|prep(?:aration)?|openings?)\b`,
  // "what openings am I missing / do I lack / do I not have an answer for"
  String.raw`\bwhat\s+openings?\s+(?:am\s+i\s+missing|do\s+i\s+(?:lack|miss|not\s+have|need))\b`,
  String.raw`\bwhat\s+(?:openings?\s+)?do\s+i\s+not\s+have\s+(?:an?\s+|any\s+)?(?:answer|response|reply|defen[cs]e)\s+(?:for|to|against)\b`,
  String.raw`\bwhat\s+(?:do\s+i|don'?t\s+i)\s+(?:have\s+)?no\s+answer\s+(?:for|to|against)\b`,
  String.raw`\bwhat\s+am\s+i\s+(?:not\s+(?:prepared|ready)|unprepared)\s+(?:for|against)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+missing\s+(?:from|in)\s+my\s+(?:repertoire|prep|openings?)\b`,
  String.raw`\bwhat\s+do\s+i\s+struggle\s+(?:against|with)\b`,
  String.raw`\bwhat\s+(?:openings?\s+)?(?:do\s+i|give\s+me)\s+(?:the\s+most\s+)?(?:trouble|problems?)\b`,
  String.raw`\bwhat\s+gives\s+me\s+(?:the\s+)?(?:most\s+)?trouble\b`,
  String.raw`\bneed\s+an?\s+answer\s+(?:to|for|against)\b`,
  // opponent prep — "how do I prepare for a 1.e4 player", "prep against d4"
  String.raw`\b(?:how\s+do\s+i\s+)?prepare\s+(?:for|against)\s+(?:a\s+)?\w+(?:\s+player)?\b`,
  String.raw`\bprep\s+(?:for|against)\s+(?:a\s+)?\w+\b`,
  String.raw`\bwhere(?:'?s| is)?\s+(?:the\s+)?gap\s+in\s+my\s+(?:prep|repertoire|openings?)\b`,
  String.raw`\bcatch\s+me\s+off\s+guard\b`,
  String.raw`\bwhere\s+am\s+i\s+(?:exposed|vulnerable|unprepared|caught\s+out|weak\s+in\s+(?:my\s+)?(?:prep|openings?|repertoire))\b`,
  String.raw`\bwhat\s+do\s+opponents?\s+get\s+me\s+with\b`,
  // learn-next
  String.raw`\bwhat\s+(?:opening|openings|lines?)\s+should\s+i\s+(?:learn|study|add|prepare|prep)\s+(?:next|to\s+my\s+repertoire)?\b`,
  String.raw`\bwhat\s+should\s+i\s+(?:learn|add\s+to\s+my\s+repertoire|prepare|prep)\s+next\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?next\s+opening\s+(?:for\s+me\s+)?to\s+(?:learn|study|prepare)\b`,
  String.raw`\bwhat\s+should\s+i\s+add\s+to\s+my\s+repertoire\b`,
  String.raw`\bwhat\s+to\s+learn\s+next\b`,
  // "what am I missing in my openings" (I-framed, vs the "what's missing" above)
  String.raw`\bwhat\s+am\s+i\s+missing\s+(?:from|in)\s+my\s+(?:repertoire|openings?|prep)\b`,
  // "what lines do I need to learn / prepare"
  String.raw`\bwhat\s+(?:lines?|openings?)\s+do\s+i\s+need\s+to\s+(?:learn|study|add|prepare|prep|know)\b`,
  // "where is my repertoire thin / weak / light" — a gap diagnosis.
  String.raw`\b(?:where(?:'?s| is)?\s+)?my\s+repertoire\s+(?:is\s+)?(?:thin|weak|light|lacking|shallow|full\s+of\s+holes)\b`,
]);
export function isRepertoireGapQuestion(ask: string | undefined): boolean {
  return !!ask && REPERTOIRE_GAP_RE.test(ask);
}
/** Which slice of the repertoire-gap answer to compute. */
export function repertoireGapKind(ask: string | undefined): 'out-of-book' | 'hole' | 'learn-next' {
  const a = (ask ?? '').toLowerCase();
  if (/\blearn\b|\badd\b|\bprepare\b|\bnext\s+opening\b|\bneed\s+to\s+(?:learn|prepare|know)\b|\bshould\s+i\s+(?:learn|study|add|prepare)\b/.test(a)) return 'learn-next';
  if (/\b(?:leave|leaving|out\s+of|off)\s+(?:the\s+|my\s+|your\s+)?(?:book|theory|prep)|\bdrift\b|\bdeviate\b/.test(a)) return 'out-of-book';
  return 'hole';
}

/** WAVE 3 — accuracy/move-quality, consistency/time-control, converting/winning.
 *  Each is about the STUDENT'S OWN play (no board), voiced from the analytics. */

/** "how accurate am I overall / how often do I find the best move / my move
 *  quality?" → assembleAccuracyAnswer. Guarded against the opening-scoped
 *  accuracy question (isOpeningAccuracyQuestion). */
const ACCURACY_QUESTION_RE = anyOf([
  String.raw`\bhow\s+accurate\s+am\s+i\b`,
  String.raw`\bhow\s+accurate\s+is\s+my\s+play\b`,
  String.raw`\bhow\s+accura(?:te|tely)\s+do\s+i\s+play\b`,   // bare "how accurately do I play" (no opening)
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:overall\s+|average\s+|typical\s+|general\s+)?accuracy\b`,
  String.raw`\bhow\s+precise\s+is\s+my\s+play\b`,
  String.raw`\bhow\s+clean\s+is\s+my\s+play\b`,
  String.raw`\bhow\s+(?:often|frequently)\s+do\s+i\s+(?:find|play)\s+the\s+best\s+move\b`,
  String.raw`\bhow\s+engine[\s-]?like\b`,
  String.raw`\bmy\s+(?:best[\s-]?move\s+)?(?:agreement|accuracy)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+move\s+quality\b`,
  String.raw`\bhow\s+many\s+brilliant\s+moves?\b`,
  String.raw`\bwhat\s+accuracy\s+do\s+i\s+(?:average|get|have|typically\s+(?:get|score|hit))\b`,
  String.raw`\bdo\s+i\s+play\s+accurate(?:ly)?\b`,
  String.raw`\bmy\s+average\s+accuracy\b`,
]);
export function isAccuracyQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // Opening-scoped accuracy belongs to isOpeningAccuracyQuestion — defer to it so
  // a NAMED opening ("how accurate am I in the Sicilian") never double-fires the
  // overall path. This is the precedence the chokepoint enforces, made explicit.
  if (isOpeningAccuracyQuestion(ask)) return false;
  return ACCURACY_QUESTION_RE.test(ask);
}

/** "am I on a streak / what time control am I best at / how consistent am I?" →
 *  assembleConsistencyAnswer (streaks + timeControlPerformance). */
const CONSISTENCY_QUESTION_RE = anyOf([
  String.raw`\b(?:am\s+i\s+on|what(?:'?s| is)?\s+my)\s+(?:a\s+)?(?:win(?:ning)?\s+)?streak\b`,
  String.raw`\bwin\s+streak\b`,
  String.raw`\bhow\s+consistent\s+am\s+i\b`,
  String.raw`\bwhat\s+time\s+control\s+am\s+i\s+(?:best|worst)\s+at\b`,
  String.raw`\bam\s+i\s+better\s+at\s+(?:blitz|bullet|rapid|classical)\b`,
  String.raw`\bhow\s+(?:often|much)\s+do\s+i\s+play\b`,
  String.raw`\bdo\s+i\s+(?:practi[cs]e|play)\s+(?:regularly|consistently|often)\b`,
  String.raw`\bmy\s+(?:best|worst)\s+time\s+control\b`,
  // "is my play consistent / am I consistent"
  String.raw`\b(?:is\s+my\s+(?:play|game|chess|form|results?)|am\s+i)\s+(?:very\s+|really\s+|pretty\s+)?(?:consistent|inconsistent|steady|erratic|streaky)\b`,
  String.raw`\bam\s+i\s+streaky\b`,
  // "do I play steadily or up and down / hot and cold"
  String.raw`\b(?:up\s+and\s+down|hot\s+and\s+cold|all\s+over\s+the\s+place|streaky)\b`,
  // "how steady/consistent are my results/games"
  String.raw`\bhow\s+(?:steady|consistent)\s+(?:are|is)\s+my\s+(?:results?|games?|play|form)\b`,
  String.raw`\bdo\s+i\s+play\s+(?:steadily|consistently)\b`,
  // "my recent form / how's my form" — recent steadiness of results.
  String.raw`\b(?:what(?:'?s| is)?\s+)?my\s+(?:recent\s+)?form\b`,
  String.raw`\bhow(?:'?s| is)\s+my\s+form\b`,
  String.raw`\bdo\s+i\s+play\s+(?:at\s+)?the\s+same\s+(?:level|standard)\b`,
  String.raw`\bsame\s+level\s+every\s+game\b`,
  String.raw`\bhow\s+(?:reliable|dependable|steady)\s+is\s+my\s+(?:play|game|chess|form)\b`,
]);
export function isConsistencyQuestion(ask: string | undefined): boolean {
  return !!ask && CONSISTENCY_QUESTION_RE.test(ask);
}

/** "do I convert winning positions / do I come back / how do I win?" →
 *  assembleConvertingAnswer (thrownWins + comebackWins + winShape). */
const CONVERTING_QUESTION_RE = anyOf([
  String.raw`\bdo\s+i\s+convert\b`,
  String.raw`\bdo\s+i\s+(?:close\s+out|finish(?:\s+off)?|seal|convert)\s+(?:won\s+|winning\s+|my\s+)*(?:wins|games|positions?|endgames?)\b`,
  String.raw`\bcan\s+i\s+(?:finish(?:\s+off)?|close\s+out|convert|seal)\s+(?:a\s+|my\s+)?(?:winning|won)?\s*(?:game|position|win)?\b`,
  String.raw`\bdo\s+i\s+let\s+(?:wins|winning\s+(?:positions?|games?)|won\s+games?)\s+slip\b`,
  // "am I good at / how well do I close out / convert / finish (off) wins"
  String.raw`\b(?:am\s+i\s+(?:good|any\s+good)\s+at|how\s+(?:good|well)\s+(?:am\s+i|do\s+i))\s+(?:at\s+)?(?:clos(?:e|ing)(?:\s+out)?|convert(?:ing)?|finish(?:ing)?(?:\s+off)?|seal(?:ing)?)\b`,
  String.raw`\bdo\s+i\s+(?:tend\s+to\s+|often\s+|usually\s+|sometimes\s+|ever\s+)?(?:throw\s+away|blow|squander|let\s+slip)\s+(?:winning|won)\b`,
  String.raw`\bdo\s+i\s+(?:come\s+back|comeback|bounce\s+back)\b`,
  String.raw`\bhow\s+(?:often\s+)?do\s+i\s+(?:comeback|come\s+back)\b`,
  String.raw`\bhow\s+do\s+i\s+win\s+(?:my\s+)?games\b`,
  String.raw`\bam\s+i\s+a\s+(?:grinder|attacker|closer)\b`,
  String.raw`\b(?:grinder|attacker)\s+or\s+(?:grinder|attacker)\b`,
  String.raw`\bdo\s+i\s+convert\s+(?:winning|won)\s+(?:positions?|games?|endgames?)\b`,
]);
export function isConvertingQuestion(ask: string | undefined): boolean {
  return !!ask && CONVERTING_QUESTION_RE.test(ask);
}

/** WAVE 4 — colour, records/bests, puzzle stats, tactic transfer gap. */

/** "am I better as White or Black?" → assembleColorAnswer. */
const COLOR_QUESTION_RE = anyOf([
  String.raw`\b(?:am\s+i|do\s+i\s+play|am\s+i\s+stronger)\s+(?:better\s+)?(?:as\s+|with\s+)?(?:white\s+or\s+black|black\s+or\s+white)\b`,
  String.raw`\b(?:better|stronger|worse|weaker)\s+(?:as|with|playing)\s+(?:the\s+)?(?:white|black)(?:\s+pieces?)?\b`,
  String.raw`\bwhich\s+colou?r\s+(?:do\s+i|am\s+i)\b`,
  String.raw`\b(?:white\s+or\s+black|black\s+or\s+white)\s+player\b`,
  String.raw`\bam\s+i\s+a\s+(?:white|black)\s+player\b`,
  // "how do I do/fare/play/score with the white/black pieces"
  String.raw`\bhow\s+do\s+i\s+(?:do|fare|play|score|perform)\s+(?:as\s+|with\s+)?(?:the\s+)?(?:white|black)(?:\s+pieces?|\s+side)?\b`,
  // bare "white or black" in any framing ("is white or black my stronger side")
  String.raw`\b(?:white\s+or\s+black|black\s+or\s+white)\b`,
  // "do I struggle as/with the white/black (pieces)"
  String.raw`\bdo\s+i\s+struggle\s+(?:as|with)\s+(?:the\s+)?(?:white|black)\b`,
  // "which side suits me / am I better / do I prefer"
  String.raw`\bwhich\s+side\s+(?:suits\s+me|am\s+i\s+(?:better|stronger)|do\s+i\s+(?:prefer|play\s+better))\b`,
]);
export function isColorQuestion(ask: string | undefined): boolean {
  return !!ask && COLOR_QUESTION_RE.test(ask);
}

/** "my best game / fastest win / records" → assembleRecordsAnswer. */
const RECORDS_QUESTION_RE = anyOf([
  String.raw`\bmy\s+(?:best|fastest|longest|most\s+accurate)\s+(?:game|win|scalp)\b`,
  // NB: standalone form requires the PLURAL "bests" ("what are my bests?").
  // A bare singular "best" is too greedy — "what is my best opening/line" is an
  // opening-profile question, not a records one, and records runs first in the
  // chokepoint so it would hijack it (David 2026-07-05 visual audit). The
  // specific "my best game/win/scalp/result" alternatives below still catch a
  // real records ask.
  String.raw`\bwhat(?:'?s| is| are)?\s+my\s+(?:records?|personal\s+bests?|bests)\b`,
  // Standalone "my records" / "show my records" (matrix audit 2026-07-09).
  String.raw`\b(?:show\s+(?:me\s+)?)?my\s+records?\b`,
  String.raw`\bmy\s+fastest\s+win\b`,
  String.raw`\bmy\s+longest\s+game\b`,
  String.raw`\bmy\s+(?:best|biggest)\s+(?:scalp|result|win|upset|victory)\b`,
  String.raw`\bhighest[\s-]?rated\s+(?:player|opponent)\s+i(?:'?ve| have)?\s+(?:ever\s+)?(?:beat|beaten|defeated|took\s+down|knocked\s+off)\b`,
  String.raw`\bwho(?:'?s| is)?\s+the\s+(?:best|highest[\s-]?rated|strongest)\s+(?:player|opponent)\s+i(?:'?ve| have)?\s+(?:ever\s+)?(?:beat|beaten|defeated)\b`,
  String.raw`\bmy\s+(?:biggest|best)\s+upset\b`,
]);
export function isRecordsQuestion(ask: string | undefined): boolean {
  return !!ask && RECORDS_QUESTION_RE.test(ask);
}

/** "how do I do against the Sicilian?" / "my record vs <name>?" →
 *  assembleOpeningRecordAnswer OR assembleOpponentRecordAnswer. The
 *  interception disambiguates opening-vs-opponent by trying to resolve
 *  the captured TARGET as a real opening; else it's an opponent. This
 *  detector both DETECTS and EXTRACTS the target term (mirrors
 *  `openingProfileKind`). Requires a target after a preposition, so a
 *  bare "what's my record" falls through to the generic records vertical. */
const RECORD_VS_LEAD = String.raw`(?:my\s+)?(?:record|results?|win[\s/-]?rate|w\/?l|win[\s/-]?loss|score|h2h|head[\s-]?to[\s-]?head)|how\s+(?:do|did|have|has|'?s)\s+i\s+(?:do|done|doing|fare|fared|perform|performed|play|played|score|scored)|(?:do|did)\s+i\s+struggle|am\s+i\s+(?:any\s+)?(?:good|bad|weak|strong|winning|losing)`;
const RECORD_VS_RE = new RegExp(
  String.raw`\b(?:${RECORD_VS_LEAD})\b[\s\S]*?\b(?:against|versus|vs\.?|v\.?|facing|in|with|playing)\s+(?:the\s+)?([a-z0-9][a-z0-9'’\-.\s]*?)\s*[?.!]*$`,
  'i',
);
// OPPONENT-record verb shapes that name a player WITHOUT an against/vs
// preposition — "have I ever beaten iankane21?", "how many times have I lost to
// Magnus?", "have I played hikaru?" (matrix pass 2, 2026-07-10).
const RECORD_VS_OPP_RE = new RegExp(
  String.raw`\b(?:have\s+i\s+(?:ever\s+)?(?:beat(?:en)?|lost\s+to|drawn?\s+(?:with|against|to)|faced|played|met)|how\s+(?:many\s+times|often)\s+have\s+i\s+(?:beat(?:en)?|lost\s+to|played|faced|met|drawn?\s+(?:with|against)))\s+(?:the\s+)?([a-z0-9][a-z0-9'’\-.]*)`,
  'i',
);
/** Trailing/leading filler that isn't part of a real opening/opponent name. */
const RECORD_VS_STOP = /^(?:it|that|them|this|those|me|him|her|us|people|players?|opponents?|everyone|anyone|games?)$/i;
export function recordVsTarget(ask: string | undefined): string | null {
  if (!ask) return null;
  const trimmed = ask.trim();
  const m = RECORD_VS_RE.exec(trimmed) ?? RECORD_VS_OPP_RE.exec(trimmed);
  if (!m) return null;
  const t = m[1].trim().replace(/\s+/g, ' ').replace(/[?.!]+$/, '').trim();
  if (t.length < 2) return null;
  // "how do I do vs that player" → "that player": keep the raw target (it just
  // won't resolve to an opening OR a real opponent → no-data), but drop a
  // bare pronoun/filler with no name so it doesn't fire on nothing.
  if (RECORD_VS_STOP.test(t)) return null;
  return t;
}
export function isRecordVsQuestion(ask: string | undefined): boolean {
  return recordVsTarget(ask) !== null;
}

/** "was that a good move? / rate my last move" → assembleMoveRatingAnswer.
 *  Board-DEPENDENT — rates the move the student JUST played by comparing it
 *  to the engine's best at the pre-move position. Distinct from
 *  isBestMoveQuestion ("what SHOULD I play?"): this grades a move already on
 *  the board. The interception falls through when there's no move history. */
const MOVE_RATING_RE = anyOf([
  // "was that (move) (any) good/ok/a mistake" — subjects incl. "that/this/the move".
  String.raw`\b(?:was|is|were)\s+(?:(?:that|this|the)\s+move|that|this|it|my\s+(?:last\s+)?move|my\s+move)\s+(?:a\s+|an\s+|the\s+|any\s+)?(?:good|bad|great|strong|weak|sound|solid|best|right|correct|blunder|mistake|inaccuracy|error|ok|okay)\b`,
  String.raw`\brate\s+(?:my|that|this|the)\s+(?:last\s+)?move\b`,
  String.raw`\bgrade\s+(?:my|that|this|the)\s+(?:last\s+)?move\b`,
  String.raw`\bhow\s+(?:good|bad|strong|was)\s+(?:was\s+)?(?:that|this|it|my\s+(?:last\s+)?move|my\s+move)\b`,
  String.raw`\bdid\s+i\s+(?:play|make|pick|choose)\s+(?:that|it|the\s+right\s+move|a\s+good\s+move|well)\b`,
  String.raw`\bwas\s+(?:that|my\s+(?:last\s+)?move)\s+(?:the\s+)?(?:right|best)\b`,
  // gerund frame: "was playing/picking/choosing/making that a mistake/good"
  String.raw`\bwas\s+(?:playing|picking|choosing|making)\s+(?:that|it|this)\s+(?:a\s+|an\s+)?(?:good|bad|sound|weak|blunder|mistake|inaccuracy|error|ok|okay)\b`,
  String.raw`\bdid\s+i\s+(?:just\s+)?(?:blunder|hang\s+(?:something|a\s+\w+)|mess\s+up|screw\s+up|goof|err|drop\s+(?:something|a\s+\w+))\b`,
]);
export function isMoveRatingQuestion(ask: string | undefined): boolean {
  return !!ask && MOVE_RATING_RE.test(ask);
}

/** "set up calculation training / train my tactics / drill my endgames" — a
 *  DIRECT request to START a training mode (not a question). Returns which
 *  training the student asked for so the interception can voice a confirm +
 *  offer the matching game-sourced action chip (David 2026-07-04: "can it set
 *  up calculation training when asked… pull from real user games"). Null when
 *  it isn't a training request. */
export type TrainingKind = 'calculation' | 'tactics' | 'endgame' | 'mistakes' | 'weakness' | 'opening' | 'review';
const TRAIN_VERB = String.raw`(?:set\s*up|start|begin|give\s+me|do|run|open|launch|train|practi[sc]e|drill|work\s+on|improve|sharpen|hone|review|analy[sz]e)`;
const TRAINING_REQUEST_RE = new RegExp(
  String.raw`\b${TRAIN_VERB}\b[\s\S]*?\b(calculation|calculating|calculate|visuali[sz]ation|tactics?|tactical|endgames?|endings?|mistakes?|blunders?|weakness(?:es)?|weak\s+spots?|openings?|opening\s+theory|repertoire|game\s+review|my\s+games?|mates?|forks?|pins?|skewers?|back[\s-]?rank|discovered|combinations?)\b`,
  'i',
);
export function trainingRequestKind(ask: string | undefined): TrainingKind | null {
  if (!ask) return null;
  const m = TRAINING_REQUEST_RE.exec(ask);
  if (!m) return null;
  const t = m[1].toLowerCase();
  if (/calculat|visuali/.test(t)) return 'calculation';
  if (/tactic|mate|fork|pin|skewer|back.?rank|discover|combination/.test(t)) return 'tactics';
  if (/endgame|ending/.test(t)) return 'endgame';
  if (/mistake|blunder/.test(t)) return 'mistakes';
  if (/weak/.test(t)) return 'weakness';
  if (/opening|repertoire/.test(t)) return 'opening';
  if (/review|my\s+games?/.test(t)) return 'review';
  return null;
}
export function isTrainingRequest(ask: string | undefined): boolean {
  return trainingRequestKind(ask) !== null;
}

/** "my puzzle rating / how many puzzles have I solved" → assemblePuzzleStatsAnswer. */
const PUZZLE_STATS_RE = anyOf([
  String.raw`\bmy\s+puzzle\s+(?:rating|accuracy|stats?|score|streak|level|tactics?|rush)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+puzzle\s+(?:rating|accuracy|streak|score|level|rush)\b`,
  String.raw`\bhow\s+good\s+is\s+my\s+puzzle\s+(?:rush|rating|streak)\b`,
  String.raw`\bhow\s+many\s+tactics?\s+(?:have\s+i|did\s+i|i'?ve)\s+(?:done|solved|completed)\b`,
  String.raw`\bhow\s+many\s+puzzles?\s+(?:have\s+i|did\s+i|i'?ve)\s+(?:solved|done|completed|got(?:ten)?)\b`,
  String.raw`\bhow\s+(?:good|strong)\s+am\s+i\s+at\s+puzzles?\b`,
  String.raw`\bpuzzle\s+(?:rating|streak)\b`,
  // "how am I doing / how do I do ON/AT/WITH puzzles"
  String.raw`\bhow\s+(?:am\s+i\s+doing|do\s+i\s+(?:do|fare))\s+(?:on|at|with|in)\s+(?:the\s+)?puzzles?\b`,
]);
export function isPuzzleStatsQuestion(ask: string | undefined): boolean {
  return !!ask && PUZZLE_STATS_RE.test(ask);
}

/** "do I spot tactics in games as well as puzzles?" → assembleTransferGapAnswer. */
const TRANSFER_GAP_RE = anyOf([
  String.raw`\bspot\s+tactics?\s+in\s+(?:my\s+)?games?\s+as\s+well\s+as\s+(?:in\s+)?puzzles?\b`,
  String.raw`\b(?:tactic\s+)?transfer\s+gap\b`,
  String.raw`\bam\s+i\s+better\s+at\s+puzzles?\s+than\s+(?:in\s+)?(?:my\s+)?games?\b`,
  String.raw`\bdo\s+i\s+(?:find|spot|see)\s+(?:in\s+games?\s+)?(?:the\s+)?tactics?\s+i\s+(?:solve|know)\b`,
  String.raw`\bpuzzles?\s+vs\.?\s+(?:my\s+)?games?\b`,
  // The signature is puzzle↔game co-occurrence with a transfer verb — "do my
  // puzzle skills show up in my games", "apply tactics in real games", "why do I
  // miss in games what I solve in puzzles", "does my puzzle rating match my games".
  String.raw`\bpuzzles?\b[^?.!]{0,45}\b(?:show\s+up|carry\s+over|translate|transfer|apply|match|help)\b[^?.!]{0,20}\bgames?\b`,
  String.raw`\bapply\s+(?:my\s+)?(?:tactics?|puzzle\w*|what\s+i\s+(?:learn|solve))\b[^?.!]{0,25}\b(?:real\s+)?games?\b`,
  String.raw`\bwhy\s+(?:are|is)\s+my\s+puzzles?\b[^?.!]{0,25}\b(?:better|higher|stronger|sharper)\b[^?.!]{0,20}\bgames?\b`,
  String.raw`\bwhy\s+do\s+i\b[^?.!]{0,40}\bpuzzles?\b[^?.!]{0,40}\bgames?\b`,
  String.raw`\bwhy\s+do\s+i\s+miss\b[^?.!]{0,25}\bgames?\b[^?.!]{0,30}\bpuzzles?\b`,
  String.raw`\bpuzzle\s+(?:rating|skills?|ability)\b[^?.!]{0,30}\b(?:my\s+)?games?\b`,
  // "why am I good at puzzles but bad in games" — the classic transfer complaint.
  String.raw`\b(?:good|better|sharp|great|strong)\s+at\s+puzzles?\b[^?.!]{0,25}\b(?:bad|worse|weak|awful|terrible)\b[^?.!]{0,15}\bgames?\b`,
  // "does my puzzle skill show up over the board / OTB"
  String.raw`\bpuzzle\s+(?:skills?|rating|ability)\b[^?.!]{0,30}\b(?:show\s+up|carry|translate|transfer)\b[^?.!]{0,25}\b(?:over\s+the\s+board|otb|real\s+games?|my\s+games?|games?)\b`,
]);
export function isTransferGapQuestion(ask: string | undefined): boolean {
  return !!ask && TRANSFER_GAP_RE.test(ask);
}

/** "what's my skill breakdown / assess my chess?" → assembleSkillRadarAnswer. */
const SKILL_RADAR_RE = anyOf([
  String.raw`\bmy\s+(?:full\s+|complete\s+|entire\s+|overall\s+)?skills?\s+(?:breakdown|profile|radar|scores?|ratings?|picture)\b`,
  String.raw`\bwhat(?:'?s| is| are)?\s+my\s+(?:full\s+|complete\s+|overall\s+)?skill\b`,
  String.raw`\bwhat\s+(?:does|do)\s+my\s+(?:full\s+|complete\s+|entire\s+|overall\s+)?skill\s+(?:profile|breakdown|radar|picture)\b`,
  String.raw`\brate\s+my\s+(?:chess|game|play)\b`,
  String.raw`\bassess\s+my\s+(?:chess|game|play)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+your\s+(?:overall\s+)?(?:read|assessment|take)\s+(?:on|of)\s+my\s+(?:chess|game|play)\b`,
  // "break down every/all part(s) of my game" + "my skills/game/chess"
  String.raw`\bbreak\s+down\s+(?:every\s+|all\s+|each\s+)?(?:parts?\s+of\s+)?my\s+(?:skills?|game|chess|abilities)\b`,
  String.raw`\bbreak\s+down\s+(?:every|all|each)\s+(?:part|aspect|bit)s?\s+of\s+my\s+(?:game|play|chess)\b`,
  // "give me a breakdown/overview/rundown of (all) my skills/game/abilities"
  String.raw`\b(?:give|show)\s+me\s+(?:a\s+|an\s+)?(?:breakdown|overview|rundown|summary|full\s+picture)\b[^?.!]{0,20}\bmy\s+(?:skills?|game|chess|abilities|play)\b`,
  String.raw`\b(?:breakdown|overview|rundown)\s+of\s+(?:all\s+)?my\s+(?:skills?|game|chess|abilities|play)\b`,
  String.raw`\bhow\s+would\s+you\s+rate\s+my\s+(?:chess|game|play)\b`,
  String.raw`\bmap\s+out\s+(?:all\s+)?my\s+skills?\b`,
  String.raw`\bwhere\s+do\s+(?:all\s+)?my\s+skills?\s+(?:sit|stand|land|rank)\b`,
  String.raw`\b(?:full|complete)\s+breakdown\s+of\s+(?:all\s+)?my\s+(?:skills?|abilities)\b`,
  // "am I better at X or Y" — a skill COMPARISON; the radar breaks all skills
  // down, which answers the comparison (matrix pass 7, 2026-07-10).
  String.raw`\bam\s+i\s+(?:better|stronger|worse|weaker|good|bad)\s+(?:at|in)\s+\w+\s+or\s+\w+\b`,
  // "what do you know about my chess/game" — a meta ask for the full profile.
  String.raw`\bwhat\s+do\s+you\s+(?:actually\s+)?know\s+about\s+my\s+(?:chess|game|play)\b`,
]);
export function isSkillRadarQuestion(ask: string | undefined): boolean {
  return !!ask && SKILL_RADAR_RE.test(ask);
}

// F11 pedagogy — "how do you teach X / how do the lessons work / your approach
// to teaching". A META question about the app's teaching METHOD, distinct from
// "teach me X" (a request to START a lesson — those must NOT match here).
const TEACHING_METHOD_RE: ReadonlyArray<RegExp> = [
  /\bhow\s+(?:do|does|would|can|should)\s+(?:you|we|i|the\s+app|the\s+coach|this\s+app|the\s+lessons?)\s+(?:teach|cover|approach|structure|present)\b/i,
  /\bhow\s+(?:is|are)\b[^?]*\b(?:taught|structured)\b/i,
  /\bhow\s+do\s+(?:the\s+|your\s+)?lessons?\s+(?:work|go|run|flow)\b/i,
  /\b(?:your|the)\s+(?:approach|method|system)\s+(?:to|for)\s+teaching\b/i,
  /\bhow\s+do\s+you\s+cover\b/i,
  /\bwhat'?s?\s+(?:your|the)\s+(?:teaching\s+)?(?:method|approach|system)\b/i,
  /\bhow\s+does\s+(?:the\s+)?(?:learn|watch|practice|wlpp|walkthrough)\b/i,
  // "walk me through how you teach X" / "how you teach the French" — no modal
  // between "how" and "you", which the modal-gated patterns above miss.
  /\bhow\s+you\s+teach\b/i,
  /\bwalk\s+me\s+through\s+(?:how\s+you\s+)?teach(?:ing)?\b/i,
  // "how would you break down / approach teaching X"
  /\bhow\s+would\s+you\s+(?:break\s+down\s+|approach\s+|go\s+about\s+|structure\s+)?teach(?:ing)?\b/i,
];

export function isTeachingMethodQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // "teach me X" is a request to start a lesson, NOT a method question.
  if (/\bteach\s+me\b/i.test(ask)) return false;
  return TEACHING_METHOD_RE.some((re) => re.test(ask));
}

// F17 settings — the DATA/QUERY half ("is voice on? what's my narration level?
// what are my settings?"). Distinct from the settings ACTIONS ("turn on voice",
// "set verbosity brief") which the action layer handles — those command verbs
// (turn/enable/disable/switch) are NOT queries and never match here.
const SETTINGS_QUERY_RE: ReadonlyArray<RegExp> = [
  /\b(?:is|are)\s+(?:my\s+|the\s+)?(?:voice\s+narration|voice|narration|hints?|sound|premium\s+voice|polly)\s+(?:on|off|enabled|disabled|muted|silent)\b/i,
  /\bwhat(?:'?s| is| are)\s+(?:my\s+)?(?:settings?|narration(?:\s+level)?|verbosity|coach\s+personality|voice\s+setting)\b/i,
  /\bwhat\s+(?:are\s+)?my\s+settings?\b/i,
  /\b(?:show\s+(?:me\s+)?|check\s+)?my\s+settings\b/i,
  /\bhow\s+(?:am\s+i|is\s+(?:the\s+)?(?:coach|voice|narration))\s+set(?:\s+up)?\b/i,
  /\b(?:voice|narration|hint)\s+(?:setting|level|status)\b/i,
  // "do I have the voice (turned) on/off" — a state query in a "do I have" frame.
  /\bdo\s+i\s+have\s+(?:the\s+|my\s+)?(?:voice\s+narration|voice|narration|hints?|sound|premium\s+voice|polly)\s+(?:turned\s+)?(?:on|off|enabled|disabled|muted)\b/i,
  // "how verbose/detailed/long/short is my narration (set)"
  /\bhow\s+(?:verbose|detailed|long|short)\s+is\s+(?:my\s+)?narration\b/i,
  // "what theme am I using / which theme is active"
  /\bwhat\s+theme\s+(?:am\s+i\s+(?:using|on)|is\s+(?:set|active|selected))\b/i,
  /\bwhich\s+theme\s+(?:am\s+i|is)\b/i,
];

export function isSettingsQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // Command verbs → an ACTION (mutate), not a query. Handled by the action layer.
  // "turned on" in a "do I have … turned on" QUERY is not a command, so exclude
  // the bare "turn" only when it's an imperative lead (not "turned").
  if (/\b(?:enable|disable|switch)\b/i.test(ask)) return false;
  if (/\bturn\b/i.test(ask) && !/\bturned\b/i.test(ask)) return false;
  return SETTINGS_QUERY_RE.some((re) => re.test(ask));
}

// F15 app-help — "what does the Tactics tab DO?", "how does the Calculation
// trainer work?", "what's the Training Plan for?". Anchored on a UI-surface
// noun (tab / page / screen / section / tool / trainer / feature) so it can't
// mis-fire on a chess question ("how does the Sicilian work" has no anchor).
const APP_HELP_RE: ReadonlyArray<RegExp> = [
  /\bwhat(?:'?s| is| does| do| are)?\b[\w'\s-]{0,30}?\b(?:tab|page|screen|section|trainer|feature)\b/i,
  /\bhow\s+(?:does|do|can|should)\b[\w'\s-]{0,30}?\b(?:tab|page|screen|section|trainer|feature)\b/i,
  /\bwhat\s+can\s+i\s+do\s+(?:in|on|with|here)\b/i,
  /\bexplain\b[\w'\s-]{0,30}?\b(?:tab|page|screen|section|trainer|feature)\b/i,
  // "how / best way to use this app (to improve)" — app-usage guidance (pass 9).
  /\b(?:how|best\s+way|what(?:'?s| is)\s+the\s+best\s+way)\s+(?:should\s+i\s+|to\s+|do\s+i\s+)?use\s+(?:this\s+|the\s+)?app\b/i,
  /\bhow\s+do\s+i\s+(?:get\s+the\s+most\s+out\s+of|make\s+the\s+most\s+of)\s+(?:this\s+|the\s+)?app\b/i,
];

export function isAppHelpQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // "teach me X" / "how do I play X" are lesson/chess asks, not app-help.
  if (/\bteach\s+me\b/i.test(ask)) return false;
  return APP_HELP_RE.some((re) => re.test(ask));
}

// TIME-TROUBLE — "do I play too fast / am I flagging / do I lose on time / do I
// blunder in time trouble". Data-capture (2026-07-10): grounded from
// `detectTimeTrouble` (blunders under the low-clock bar). Distinct from the
// consistency/time-control question (WHICH time control I'm best at).
const TIME_TROUBLE_RE: ReadonlyArray<RegExp> = [
  /\b(?:in\s+)?time\s+(?:trouble|pressure|scramble)\b/i,
  /\bdo\s+i\s+(?:play|move|go)\s+too\s+(?:fast|quickly|quick)\b/i,
  /\bdo\s+i\s+rush\b/i,
  /\bam\s+i\s+flagging\b/i,
  /\bdo\s+i\s+(?:lose|flag|blunder|crumble|panic)\s+(?:on|under|in|with)\s+(?:time|(?:a\s+|the\s+)?(?:low\s+)?clock|low\s+time)\b/i,
  /\bdo\s+i\s+lose\s+on\s+time\b/i,
  /\b(?:blunder|mistakes?|errors?)\s+(?:in|under|on)\s+(?:time\s+trouble|low\s+time|the\s+clock)\b/i,
  /\bhow(?:'?s| is)\s+my\s+(?:clock|time)\s+management\b/i,
  /\bdo\s+i\s+manage\s+(?:my\s+)?(?:clock|time)\b/i,
];
export function isTimeTroubleQuestion(ask: string | undefined): boolean {
  return !!ask && TIME_TROUBLE_RE.some((re) => re.test(ask));
}

// LAST-GAME RESULT — "did I win my last game / how did my last game go / what
// was the result". Data-capture (2026-07-10): the most-recent game record's
// outcome. A factual QUERY (distinct from the review-game ACTION, which walks
// the moves) — no review/walk verb, just asks the outcome.
const LAST_GAME_RE: ReadonlyArray<RegExp> = [
  /\bdid\s+i\s+(?:win|lose|draw)\s+(?:my\s+)?(?:last|latest|most\s+recent|previous)\s+game\b/i,
  /\b(?:what(?:'?s| was)?\s+)?(?:the\s+)?result\s+of\s+my\s+(?:last|latest|most\s+recent|previous)\s+game\b/i,
  /\bhow\s+did\s+(?:my\s+(?:last|latest|previous)\s+game\s+go|i\s+do\s+(?:in\s+)?(?:my\s+)?(?:last|latest|previous)\s+game)\b/i,
  /\bwon\s+or\s+lost\s+(?:my\s+)?last\s+game\b/i,
];
export function isLastGameQuestion(ask: string | undefined): boolean {
  if (!ask) return false;
  // A "review / walk me through / go over my last game" is the ACTION, not this
  // factual query — defer so we don't answer with a bare result when the user
  // wants the walkthrough.
  if (/\b(?:review|walk\s+(?:me\s+)?through|go\s+(?:over|through)|run\s+(?:me\s+)?through|narrate|recap|replay|analy[sz]e)\b/i.test(ask)) return false;
  return LAST_GAME_RE.some((re) => re.test(ask));
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
  // Normalize conversational filler ONCE so every predicate below sees the
  // de-padded question ("hey so um whos winning" → "whos winning"). Matrix
  // pass 4, 2026-07-10.
  const a = stripQuestionFiller(ask);
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
    planQuestion: isPlanQuestion(a),
    bestMoveQuestion: isBestMoveQuestion(a),
    tacticsQuestion: isTacticsQuestion(a),
    progressQuestion: isProgressQuestion(a),
    trendQuestion: isImprovementTrendQuestion(a),
    openingProfileQuestion: isOpeningProfileQuestion(a),
    openingProfileKind: openingProfileKind(a),
    statsQuestion: isStatsQuestion(a),
    strengthsQuestion: isStrengthsQuestion(a),
    openingAccuracyQuestion: isOpeningAccuracyQuestion(a),
    openingTrapsQuestion: isOpeningTrapsQuestion(a),
    openingTrapsSystemAsk: opensTrapsSystemAsk(a),
    reviewDueQuestion: isReviewDueQuestion(a),
    mistakesQuestion: isMistakesQuestion(a),
    tacticsProfileQuestion: isTacticsProfileQuestion(a),
    phaseQuestion: isPhaseQuestion(a),
    repertoireGapQuestion: isRepertoireGapQuestion(a),
    repertoireGapKind: repertoireGapKind(a),
    accuracyQuestion: isAccuracyQuestion(a),
    consistencyQuestion: isConsistencyQuestion(a),
    convertingQuestion: isConvertingQuestion(a),
    colorQuestion: isColorQuestion(a),
    recordsQuestion: isRecordsQuestion(a),
    recordVsTarget: recordVsTarget(a) ?? undefined,
    moveRatingQuestion: isMoveRatingQuestion(a),
    trainingRequestKind: trainingRequestKind(a) ?? undefined,
    puzzleStatsQuestion: isPuzzleStatsQuestion(a),
    transferGapQuestion: isTransferGapQuestion(a),
    skillRadarQuestion: isSkillRadarQuestion(a),
    masterPlayQuestion: isMasterPlayQuestion(a),
    conceptQuestion: isConceptQuestion(a),
    playerGamesQuestion: isPlayerGamesQuestion(a),
    endgameQuestion: isEndgameQuestion(a),
    positionAssessmentQuestion: isPositionAssessmentQuestion(a),
    teachingMethodQuestion: isTeachingMethodQuestion(a),
    settingsQuestion: isSettingsQuestion(a),
    appHelpQuestion: isAppHelpQuestion(a),
    timeTroubleQuestion: isTimeTroubleQuestion(a),
    lastGameQuestion: isLastGameQuestion(a),
  };
}
