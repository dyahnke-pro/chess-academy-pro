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
 *  request to TRAIN it (vs merely mention it in a question). */
const FRAMING_RE =
  /\b(?:drill|drills|practi[cs]e|practi[cs]ing|train(?:ing)?|work\s+on|sharpen|improve|quiz(?:\s+me)?|give\s+me|show\s+me|let'?s\s+(?:do|try|practi[cs]e|work\s+on)|i\s+(?:want|need)|start)\b/i;

export function matchTrainingAidRoute(text: string): TrainingAidRoute | null {
  const raw = text.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
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

  // 8. Tactics / puzzles (+ named theme when present). The word
  //    "puzzle"/"tactic" is an explicit trainer request; a bare named
  //    theme ("drill forks") needs a framing verb so we don't hijack
  //    "was that a fork?".
  const hasPuzzleWord = /\b(?:puzzle|puzzles|tactic|tactics|tactical)\b/i.test(lower);
  const theme = resolveTacticalTheme(lower);
  if (hasPuzzleWord) {
    return puzzleRoute(theme);
  }
  if (theme && theme !== 'endgame' && framed) {
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
