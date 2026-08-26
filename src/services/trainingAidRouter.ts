/**
 * trainingAidRouter
 * -----------------
 * ONE deterministic matcher that maps a coach-chat training request
 * ("drill tactics", "give me a fork puzzle", "practice mating
 * patterns", "endgame drill", "work on my calculation", "show me my
 * weaknesses") to the REAL training surface that already exists in the
 * app.
 *
 * This is a HARD requirement of G0 (the LLM decides no chess content).
 * Before this router, a training-drill request on the coach chat fell
 * through to the brain, which INVENTED a fake drill (David's report:
 * "drill calculation" → the LLM declared "the purest calculation drill
 * is finding the best first move from the starting position" — chess
 * nonsense). Every one of these aids is a purpose-built, code-driven
 * surface (puzzles filtered from the Lichess DB, mating-pattern lessons,
 * endgame drills, the weakness analyzer). We route to them; the LLM
 * never authors a drill.
 *
 * Shared by every chat surface so "drill X" behaves identically
 * everywhere:
 *   - coachIntentRouter.tryRouteIntent  → GameChatPanel (mid-game) + VoiceChatMic
 *   - coachSessionRouter.routeChatIntent → CoachChatPage + GameChatPanel (post-game)
 *   - CoachTeachPage.handleSubmit        → Learn-with-Coach
 *
 * Matching is intentionally tight: each aid requires either an
 * unambiguous multi-word surface phrase ("mating patterns", "eval lab",
 * "pawn endings") or a practice/drill FRAMING verb paired with the aid
 * noun. Bare questions ("what is a fork?", "how do I calculate?") and
 * opening drills ("drill the Vienna") do NOT match — they fall through
 * to the brain / the opening router. Opening names are never training
 * aids, so "drill the Najdorf" is untouched here.
 */
import { TACTICAL_THEMES } from './puzzleService';

export interface TrainingAidRoute {
  /** Relative route (starts with `/`) to navigate to. */
  path: string;
  /** Short coach acknowledgement shown/spoken before navigating. */
  ack: string;
  /** Stable slug for audits / analytics. */
  aid: string;
}

/** Practice / drill framing — the verbs that turn an aid noun into a
 *  request to TRAIN it (vs merely mention it in a question). `teach`/`learn`
 *  are framing verbs too (David 2026-07-16): "teach me tactics" / "teach me
 *  endgames" / "learn tactics" are training requests, not board questions —
 *  they used to slip past every matcher and dead-end on the grounded coach's
 *  "I can't verify that precisely" stock line. An opening name ("teach me the
 *  Najdorf") carries no aid noun, so it still falls through to the opening
 *  router — this only routes the tactics/endgame/calculation/mate/puzzle
 *  aid nouns. */
const FRAMING_RE =
  /\b(?:drill|drills|practi[cs]e|practi[cs]ing|train(?:ing)?|work\s+on|sharpen|improve|quiz(?:\s+me)?|give\s+me|show\s+me|teach(?:\s+me)?|learn|let'?s\s+(?:do|try|practi[cs]e|work\s+on)|i\s+(?:want|need)|start)\b/i;

/** A weakness-DIAGNOSIS / recommendation QUESTION ("what tactics am I weak
 *  in?", "where am I losing?", "what should I train?") is NOT a drill
 *  imperative — it's the grounded coach's job to name the student's real
 *  weaknesses from their own data (G0, via `isProgressQuestion` →
 *  `assembleWeaknessRecommendation`). Without this guard the tactics/endgame
 *  drill branches below would hijack the DIAGNOSIS word ("tactics") and start
 *  a drill instead of answering the question David actually asked
 *  (2026-07-04). Kept self-contained (no coachService import) so every surface
 *  that shares this router inherits the same diagnosis-vs-drill precedence.
 *  Interrogative-led ONLY — a real drill IMPERATIVE ("drill my weaknesses",
 *  "give me a tactics puzzle") has no what/which/where/why/how lead-in, so it
 *  still routes to a drill. */
const DIAGNOSIS_RE =
  // "do I …" / "am I …" lead-ins added 2026-08-13 (varied-phrasing sweep,
  // run allq-mss55zxn): "do I blunder in time trouble?" and "why am I good
  // at puzzles but bad IN games?" both slipped this guard by one word each
  // and got hijacked into drills instead of their grounded answers.
  /\b(?:what|which|where|why|how|do\s+i|am\s+i)\b[\s\S]{0,50}?\b(?:weak(?:est|ness(?:es)?)?|bad\s+(?:at|in)|worst\s+at|poor\s+at|struggl(?:e|ing)|los(?:e|ing)|blunder(?:ing)?|go(?:ing)?\s+wrong|mess(?:ing)?\s+up|holding\s+me\s+back|costing\s+me|time\s+trouble|need(?:s)?\s+(?:the\s+most\s+)?work|should\s+i\s+(?:train|learn|study|work\s+on|focus|improve|practi[sc]e)|do\s+i\s+(?:need\s+to|train|learn|work\s+on|focus|improve))\b/i;

/** A puzzle/tactic STATS question ("my puzzle rating", "how many puzzles have I
 *  solved", "my puzzle accuracy") is answered by the grounded coach
 *  (isPuzzleStatsQuestion → assemblePuzzleStatsAnswer), NOT a drill. Without
 *  this guard the `hasExplicitPuzzleWord` branch below hijacked any "puzzle"
 *  mention — including a stats question — into a puzzle drill (David 2026-07-05
 *  functional audit: "what's my puzzle rating?" → "no mistakes due to review").
 *  Interrogative/possessive-led, so a real drill imperative ("give me a puzzle",
 *  "drill a fork puzzle") has no rating/accuracy/count noun and still drills. */
const STATS_RE =
  /\bmy\s+puzzle\s+(?:rating|accuracy|score|stats?|elo)\b|\bhow\s+many\s+puzzles?\s+(?:have\s+i|did\s+i|i'?ve)\s+(?:solved|done|completed|gotten)\b|\bhow\s+(?:good|strong)\s+am\s+i\s+at\s+puzzles?\b|\bwhat(?:'?s| is)?\s+my\s+puzzle\s+(?:rating|accuracy|score|stats?)\b/i;

/** A HOW-TO question ("how do I win a king and pawn endgame?", "how should I
 *  convert this?") is a TEACHING ask for the brain — never a drill hand-off.
 *  The pawn/rook-endings branches below have no framing requirement (a bare
 *  "pawn endings" chip is a legitimate drill request), so without this guard a
 *  live prod question got "On it." and a navigation to /coach/teach?drill=
 *  pawn-endings instead of an answer (2026-08-13 audit, run qafn-msrnlovk —
 *  the same question-vs-drill class the DIAGNOSIS guard fixed for tactics on
 *  2026-07-04). Interrogative-led ONLY: a drill imperative has no "how do I"
 *  lead-in and still drills. */
const HOWTO_RE =
  /\b(?:how\s+(?:do|can|should|would)\s+i|how\s+to|what(?:'?s| is)\s+the\s+(?:best\s+)?(?:way|technique|method|plan|idea))\b[\s\S]{0,40}\b(?:win|hold|draw|convert|defend|play|handle|approach|checkmate|mate)\b/i;

/** A TEACHING ask about the student's own weaknesses ("teach me my
 *  weaknesses", "tell/show/explain my weak spots", "go over my weaknesses")
 *  is the grounded brain's job to TEACH IN-CHAT (isProgressQuestion →
 *  assembleWeaknessRecommendation → voiceFacts), NOT a drill hand-off.
 *  Without this guard "teach me my weaknesses" is framed=true via FRAMING_RE's
 *  teach/show verbs and gets hijacked into the mistake drill (branch 11),
 *  routing the student OFF the coach tab instead of teaching them there
 *  (David 2026-08-26: "it couldnt tell me my weaknesses. it just routed me to
 *  the tactics page … all of this needs to be taught while in the coach tab").
 *  A genuine drill imperative ("drill/practice my weaknesses") uses a practice
 *  verb, not teach/tell/show/explain, so it still routes to the drill. */
const WEAKNESS_TEACH_RE =
  /\b(?:teach|tell|show|explain|go\s+over|walk\s+me\s+through|talk\s+me\s+through)\b[\s\S]{0,30}?\b(?:weakness(?:es)?|weak\s+(?:spots?|squares?|areas?|points?)|bad\s+habits?)\b/i;

export function matchTrainingAidRoute(text: string): TrainingAidRoute | null {
  const raw = text.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  // A "teach/tell/show me my weaknesses" ask is TAUGHT in-chat by the brain.
  if (WEAKNESS_TEACH_RE.test(lower)) return null;
  // Diagnosis/recommendation QUESTIONS go to the grounded brain, not a drill.
  if (DIAGNOSIS_RE.test(lower)) return null;
  // Puzzle/tactic STATS questions go to the grounded brain, not a drill.
  if (STATS_RE.test(lower)) return null;
  // HOW-TO questions go to the grounded brain, not a drill.
  if (HOWTO_RE.test(lower)) return null;
  const framed = FRAMING_RE.test(lower);

  // 1. Calculation drills → set a real puzzle up ON THE BOARD in Learn
  //    (David: no tab routing; the coach sets them up on the board).
  //    verb↔noun in either order; British spelling; bare "calculation
  //    drill". Bare "how do I calculate?" (no framing) is NOT matched.
  if (
    /\b(?:drill|practi[cs]e|train(?:ing)?|work\s+on|sharpen|improve|exercise)\b[\s\w']{0,24}\bcalculat(?:e|es|ing|ion)\b/i.test(lower) ||
    /\bcalculat(?:e|es|ing|ion)\b[\s\w']{0,24}\b(?:drill[s]?|practi[cs]e|training|exercise[s]?)\b/i.test(lower)
  ) {
    return drillRoute('calculation', 'a calculation');
  }

  // 2. Mating-pattern practice → a real mate puzzle on the board.
  if (
    /\b(?:mating|mate|checkmate)\s+patterns?\b/i.test(lower) ||
    /\b(?:mating|checkmate|checkmating)\s+(?:practi[cs]e|drill[s]?|training|exercise[s]?)\b/i.test(lower)
  ) {
    return drillRoute('mating-patterns', 'a mating-pattern');
  }

  // 3. Eval Lab → position-evaluation drills.
  if (/\beval(?:uation)?\s+lab\b/i.test(lower)) {
    return { path: '/coach/endgame?tab=eval-lab', ack: 'Opening the Eval Lab.', aid: 'eval-lab' };
  }

  // 4. Pawn endings → a real pawn-endgame puzzle on the board.
  if (/\bpawn\s+(?:ending|endings|endgame|endgames)\b/i.test(lower)) {
    return drillRoute('pawn-endings', 'a pawn-ending');
  }

  // 5. Rook endings → a real rook-endgame puzzle on the board.
  if (/\brook\s+(?:ending|endings|endgame|endgames)\b/i.test(lower)) {
    return drillRoute('rook-endings', 'a rook-ending');
  }

  // 6. Drawing patterns.
  if (/\b(?:drawing|drawn)\s+patterns?\b/i.test(lower)) {
    return { path: '/coach/endgame?tab=drawing-patterns', ack: 'Loading drawing-pattern practice.', aid: 'drawing-patterns' };
  }

  // 7. Endgame principles.
  if (/\bendgame\s+principles?\b/i.test(lower)) {
    return { path: '/coach/endgame?tab=principles', ack: 'Loading endgame principles.', aid: 'endgame-principles' };
  }

  // 8. Tactics / puzzles (+ named theme when present).
  //    A tactics QUESTION about the LIVE board ("is there a tactic here?",
  //    "any tactics in this position?", "what tactics should I look for?") must
  //    reach the grounded brain (isTacticsQuestion) — NOT get yanked into a
  //    puzzle drill that navigates the student OUT of their live /coach/play
  //    game (David 2026-07-04 adversarial audit). Two rules:
  //      - "puzzle(s)" is an explicit TRAINER noun → always a drill request.
  //      - a bare "tactic(s)/tactical" or a named motif ("fork") is ambiguous:
  //        drill ONLY with a framing verb AND no live-board reference;
  //        otherwise it's a board question and falls through to the brain.
  const hasExplicitPuzzleWord = /\bpuzzles?\b/i.test(lower);
  const hasTacticWord = /\b(?:tactics?|tactical)\b/i.test(lower);
  const referencesLiveBoard = /\b(?:here|this position|this one|in this|on the board|right now|current position|this game)\b/i.test(lower);
  const theme = resolveTacticalTheme(lower);
  if (hasExplicitPuzzleWord) {
    return puzzleRoute(theme);
  }
  if (hasTacticWord && framed && !referencesLiveBoard) {
    return puzzleRoute(theme);
  }
  if (theme && theme !== 'endgame' && framed && !referencesLiveBoard) {
    return puzzleRoute(theme);
  }

  // 9. Endgame (generic) — after the specific endgame sub-surfaces and
  //    the puzzle branch, so "endgame puzzles" went to puzzles and
  //    "rook endings" went to its tab. Needs a framing verb.
  if (/\bend\s?games?\b/i.test(lower) && framed) {
    return drillRoute('endgame', 'an endgame');
  }

  // 10. My mistakes → the adaptive mistake queue, ON THE BOARD in Learn
  //     (David 2026-07-03: pull drills from the user's own mistakes, most
  //     common first, until they test out, then the next). Framed only, so
  //     "why do I keep making mistakes?" isn't hijacked. `mistakes` is a
  //     drillable aid → startMistakeDrills builds the ranked queue.
  if (framed && (/\bmy\s+mistakes?\b/i.test(lower) || /\bmistakes?\s+(?:drill[s]?|trainer|practi[cs]e)\b/i.test(lower))) {
    return { path: '/coach/teach?drill=mistakes', ack: 'Pulling up your mistakes to drill on the board.', aid: 'mistakes' };
  }

  // 11. Weaknesses → the SAME adaptive mistake queue (drilling your
  //     weaknesses IS drilling your mistakes). Framed only, so "what's my
  //     weakness in the Sicilian?" stays a brain question.
  if (framed && (/\bweakness(?:es)?\b/i.test(lower) || /\bweak\s+(?:spots?|squares?)\b/i.test(lower))) {
    return { path: '/coach/teach?drill=mistakes', ack: "Let's drill your weaknesses on the board.", aid: 'mistakes' };
  }

  return null;
}

function puzzleRoute(theme: string | null): TrainingAidRoute {
  if (theme) {
    return drillRoute(`puzzle:${theme}`, `a ${spacedTheme(theme)} tactics`);
  }
  return drillRoute('puzzle', 'a tactics');
}

/** A drill aid → set it up ON THE BOARD in the Learn tab. When the
 *  request is typed on the Learn surface it's handled in-place (no
 *  navigation); from any other surface (play / chat / voice) we hand off
 *  to `/coach/teach?drill=<aid>`, which auto-starts the same in-place
 *  drill. Either way the coach sets a REAL code-selected puzzle on the
 *  board — never the tactics tab, never an LLM-invented drill. */
function drillRoute(aid: string, article: string): TrainingAidRoute {
  return {
    path: `/coach/teach?drill=${encodeURIComponent(aid)}`,
    ack: `Setting up ${article} drill on the board.`,
    aid,
  };
}

/** Match a free-text message against the known TACTICAL_THEMES set,
 *  handling camelCase ("discoveredAttack" → "discovered attack"),
 *  simple plurals ("forks"), and the spaced form. Returns the canonical
 *  theme token or null. */
function resolveTacticalTheme(lower: string): string | null {
  for (const t of TACTICAL_THEMES) {
    const tl = t.toLowerCase();
    const spaced = t.replace(/([A-Z0-9])/g, ' $1').toLowerCase().trim();
    if (
      new RegExp(`\\b${escapeRegExp(tl)}\\b`).test(lower) ||
      new RegExp(`\\b${escapeRegExp(spaced)}\\b`).test(lower)
    ) {
      return t;
    }
  }
  // Plural bare themes: "forks", "pins", "skewers".
  for (const t of TACTICAL_THEMES) {
    if (new RegExp(`\\b${escapeRegExp(t.toLowerCase())}s\\b`).test(lower)) return t;
  }
  return null;
}

function spacedTheme(t: string): string {
  return t.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
